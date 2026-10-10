// Shared bits for the admin Server Actions. Not a "use server" file: every
// export of one becomes a publicly callable endpoint.

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

/** What every admin form action returns to useActionState. */
export type FormState = { error?: string; message?: string } | null;

export function text(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function textOrNull(fd: FormData, name: string): string | null {
  return text(fd, name) || null;
}

/** Blank -> null; anything else must be a whole number in [min, max]. */
export function intOrNull(fd: FormData, name: string, label: string, min: number, max: number): number | null {
  const raw = text(fd, name);
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new FormError(`${label} phải là số nguyên từ ${min} đến ${max}`);
  }
  return n;
}

export function intRequired(fd: FormData, name: string, label: string, min: number, max: number): number {
  const n = intOrNull(fd, name, label, min, max);
  if (n === null) throw new FormError(`Thiếu ${label}`);
  return n;
}

/** "2035, 2036 2037" -> [2035, 2036, 2037]; throws on anything that isn't a positive id. */
export function idList(raw: string, label: string): number[] {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const ids = parts.map(Number);
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new FormError(`${label} chỉ gồm các ID số, cách nhau bằng dấu phẩy`);
  }
  return ids;
}

/** A validation problem worth showing to the admin as-is. */
export class FormError extends Error {}

/** Runs a form handler, turning FormError (and SQLite constraint errors) into a FormState. */
export async function handleForm(run: () => Promise<FormState>): Promise<FormState> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof FormError) return { error: err.message };
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE constraint failed")) return { error: "Tên này đã tồn tại" };
    if (msg.includes("CHECK constraint failed")) return { error: "Giá trị không hợp lệ" };
    throw err;
  }
}

// Match times are stored in UTC; admins (and the site) work in Vietnam time,
// which is a fixed UTC+7 with no daylight saving.
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** "2026-09-26 07:46:31" (UTC, as stored) -> "2026-09-26T14:46" for <input type="datetime-local">. */
export function utcToVnInput(stored: string): string {
  const d = new Date(stored.replace(" ", "T") + "Z");
  return new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-09-26T14:46" (Vietnam time from the form) -> "2026-09-26 07:46:00" (UTC, for storage). */
export function vnInputToUtc(input: string): string {
  const d = new Date(input + ":00Z");
  if (Number.isNaN(d.getTime())) throw new FormError("Thời gian không hợp lệ");
  return new Date(d.getTime() - VN_OFFSET_MS).toISOString().replace("T", " ").slice(0, 19);
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

/** Shared checks for a new account's username and password fields. */
export async function readNewCredentials(fd: FormData): Promise<{ username: string; password: string }> {
  const username = text(fd, "username");
  const password = (fd.get("password") as string | null) ?? "";
  const confirm = (fd.get("confirm") as string | null) ?? "";
  if (!USERNAME_RE.test(username)) {
    throw new FormError("Tên đăng nhập 3–32 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, gạch ngang");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new FormError(`Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
  }
  if (password !== confirm) throw new FormError("Hai lần nhập mật khẩu không khớp");
  return { username, password };
}
