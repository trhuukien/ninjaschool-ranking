import "server-only";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./auth/password";

export interface AdminRow {
  id: number;
  username: string;
  created_at: string;
}

export async function countAdmins(): Promise<number> {
  const db = await getDb();
  const row = await db.prepare("SELECT COUNT(*) AS n FROM admins").first<{ n: number }>();
  return row?.n ?? 0;
}

export async function listAdmins(): Promise<AdminRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare("SELECT id, username, created_at FROM admins ORDER BY username")
    .all<AdminRow>();
  return results;
}

/** The admin's id when the username/password pair is right, otherwise null. */
export async function checkCredentials(username: string, password: string): Promise<number | null> {
  const db = await getDb();
  const row = await db
    .prepare("SELECT id, password_hash FROM admins WHERE username = ?")
    .bind(username)
    .first<{ id: number; password_hash: string }>();
  if (!row) return null;
  return (await verifyPassword(password, row.password_hash)) ? row.id : null;
}

export async function createAdmin(username: string, password: string): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("INSERT INTO admins (username, password_hash) VALUES (?1, ?2) RETURNING id")
    .bind(username, await hashPassword(password))
    .first<{ id: number }>();
  return row!.id;
}

export async function setAdminPassword(adminId: number, password: string): Promise<void> {
  const db = await getDb();
  await db.batch([
    db.prepare("UPDATE admins SET password_hash = ?1 WHERE id = ?2").bind(await hashPassword(password), adminId),
    // A password change signs the account out everywhere else.
    db.prepare("DELETE FROM admin_sessions WHERE admin_id = ?").bind(adminId),
  ]);
}

export async function deleteAdmin(adminId: number): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM admins WHERE id = ?").bind(adminId).run();
}
