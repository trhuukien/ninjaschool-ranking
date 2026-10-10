import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";

// Admin login sessions live in D1 (admin_sessions); the browser only holds a
// random token, and the table stores its SHA-256, so a leaked DB can't be
// replayed as a cookie and logging out kills the session server-side.

const COOKIE = "ns_admin_session";
const SESSION_DAYS = 30;

export interface CurrentAdmin {
  id: number;
  username: string;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Starts a session for the admin and sets the cookie. Server Actions only. */
export async function createSession(adminId: number): Promise<void> {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = await getDb();
  await db.batch([
    db.prepare("DELETE FROM admin_sessions WHERE expires_at <= datetime('now')"),
    db
      .prepare("INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?1, ?2, ?3)")
      .bind(await sha256Hex(token), adminId, expires.toISOString().replace("T", " ").slice(0, 19)),
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** The logged-in admin, or null. Safe to call from any server code. */
export const getCurrentAdmin = cache(async (): Promise<CurrentAdmin | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT a.id, a.username FROM admin_sessions s
         JOIN admins a ON a.id = s.admin_id
        WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
    )
    .bind(await sha256Hex(token))
    .first<CurrentAdmin>();
  return row ?? null;
});

/** The logged-in admin; otherwise sends the visitor to the login page. */
export async function requireAdmin(): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Ends the current session (if any) and clears the cookie. Server Actions only. */
export async function deleteCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  }
  store.delete(COOKIE);
}
