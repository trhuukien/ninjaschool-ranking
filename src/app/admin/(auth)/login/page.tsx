import { redirect } from "next/navigation";
import { countAdmins } from "@/lib/admins";
import { getCurrentAdmin } from "@/lib/auth/session";
import { cardClass } from "@/lib/ui";
import { login } from "../../actions/auth";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  if ((await countAdmins()) === 0) redirect("/admin/setup");

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      <PageTitle>Đăng nhập quản trị</PageTitle>
      <div className={cardClass + " p-4"}>
        <ActionForm action={login} submitLabel="Đăng nhập" pendingLabel="Đang đăng nhập...">
          <Field label="Tên đăng nhập">
            <TextInput name="username" autoComplete="username" required />
          </Field>
          <Field label="Mật khẩu">
            <TextInput name="password" type="password" autoComplete="current-password" required />
          </Field>
        </ActionForm>
      </div>
    </div>
  );
}
