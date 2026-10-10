"use server";

import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkCredentials, countAdmins, createAdmin } from "@/lib/admins";
import { createSession, deleteCurrentSession } from "@/lib/auth/session";
import { FormError, handleForm, readNewCredentials, text, type FormState } from "./form";

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const username = text(fd, "username");
  const password = typeof fd.get("password") === "string" ? (fd.get("password") as string) : "";
  const adminId = username && password ? await checkCredentials(username, password) : null;
  if (!adminId) return { error: "Sai tên đăng nhập hoặc mật khẩu" };
  await createSession(adminId);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await deleteCurrentSession();
  redirect("/");
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Creates the very first admin. Only works while there are no admins at all,
 * and only with the ADMIN_SETUP_TOKEN secret, so a fresh deploy can't be
 * claimed by whoever finds /admin/setup first.
 */
export async function setupFirstAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  const state = await handleForm(async () => {
    if ((await countAdmins()) > 0) throw new FormError("Đã có tài khoản admin — hãy đăng nhập.");
    const { env } = await getCloudflareContext({ async: true });
    const expected = env.ADMIN_SETUP_TOKEN;
    if (!expected) throw new FormError("Chưa đặt secret ADMIN_SETUP_TOKEN trên server.");
    if (!sameSecret(text(fd, "token"), expected)) throw new FormError("Mã cài đặt không đúng");
    const { username, password } = await readNewCredentials(fd);
    const id = await createAdmin(username, password);
    await createSession(id);
    return null;
  });
  if (state) return state;
  redirect("/admin");
}
