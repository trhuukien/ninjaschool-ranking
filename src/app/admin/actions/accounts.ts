"use server";

import { revalidatePath } from "next/cache";
import { checkCredentials, countAdmins, createAdmin, deleteAdmin, setAdminPassword } from "@/lib/admins";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { createSession, requireAdmin } from "@/lib/auth/session";
import { FormError, handleForm, readNewCredentials, type FormState } from "./form";

export async function createAdminAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    const { username, password } = await readNewCredentials(fd);
    await createAdmin(username, password);
    revalidatePath("/admin/accounts");
    return { message: `Đã tạo tài khoản ${username}` };
  });
}

export async function deleteAdminAction(adminId: number): Promise<FormState> {
  const me = await requireAdmin();
  return handleForm(async () => {
    if (adminId === me.id) throw new FormError("Không thể tự xoá tài khoản đang đăng nhập");
    if ((await countAdmins()) <= 1) throw new FormError("Phải còn ít nhất 1 tài khoản admin");
    await deleteAdmin(adminId);
    revalidatePath("/admin/accounts");
    return { message: "Đã xoá tài khoản" };
  });
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const me = await requireAdmin();
  return handleForm(async () => {
    const current = (fd.get("current") as string | null) ?? "";
    const password = (fd.get("password") as string | null) ?? "";
    const confirm = (fd.get("confirm") as string | null) ?? "";
    if ((await checkCredentials(me.username, current)) !== me.id) throw new FormError("Mật khẩu hiện tại không đúng");
    if (password.length < MIN_PASSWORD_LENGTH) throw new FormError(`Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
    if (password !== confirm) throw new FormError("Hai lần nhập mật khẩu không khớp");
    // Signs the account out everywhere, then starts a fresh session here.
    await setAdminPassword(me.id, password);
    await createSession(me.id);
    return { message: "Đã đổi mật khẩu; các phiên đăng nhập khác đã bị đăng xuất" };
  });
}
