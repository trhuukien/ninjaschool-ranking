import { redirect } from "next/navigation";
import { countAdmins } from "@/lib/admins";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { cardClass } from "@/lib/ui";
import { setupFirstAdmin } from "../../actions/auth";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

/** One-time creation of the first admin; gone once any admin exists. */
export default async function SetupPage() {
  if ((await countAdmins()) > 0) redirect("/admin/login");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <PageTitle>Tạo tài khoản admin đầu tiên</PageTitle>
      <p className="text-sm text-muted">
        Chỉ dùng được một lần khi chưa có admin nào. Cần mã cài đặt (secret <code>ADMIN_SETUP_TOKEN</code> trên
        Cloudflare).
      </p>
      <div className={cardClass + " p-4"}>
        <ActionForm action={setupFirstAdmin} submitLabel="Tạo tài khoản">
          <Field label="Mã cài đặt">
            <TextInput name="token" type="password" autoComplete="off" required />
          </Field>
          <Field label="Tên đăng nhập">
            <TextInput name="username" autoComplete="username" required />
          </Field>
          <Field label="Mật khẩu" hint={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}>
            <TextInput name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Nhập lại mật khẩu">
            <TextInput name="confirm" type="password" autoComplete="new-password" required />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
