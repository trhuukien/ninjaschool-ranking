import { listAdmins } from "@/lib/admins";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { requireAdmin } from "@/lib/auth/session";
import { cardClass } from "@/lib/ui";
import { changePasswordAction, createAdminAction, deleteAdminAction } from "../../actions/accounts";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

export default async function AdminAccountsPage() {
  const me = await requireAdmin();
  const admins = await listAdmins();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Tài khoản admin</PageTitle>

      <section className={cardClass + " divide-y divide-border"}>
        {admins.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="font-medium">{a.username}</span>
            {a.id === me.id && <span className="text-xs text-muted">(bạn)</span>}
            <span className="text-xs text-muted">tạo {new Date(a.created_at + "Z").toLocaleDateString("vi-VN")}</span>
            {a.id !== me.id && (
              <div className="ml-auto">
                <ActionForm
                  action={deleteAdminAction.bind(null, a.id)}
                  submitLabel="Xoá"
                  pendingLabel="Đang xoá..."
                  confirm={`Xoá tài khoản ${a.username}?`}
                  danger
                  className="flex items-center gap-2"
                />
              </div>
            )}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className={cardClass + " p-4"}>
          <h2 className="mb-3 font-display text-lg font-semibold">Thêm admin</h2>
          <ActionForm action={createAdminAction} submitLabel="Tạo tài khoản" resetOnSuccess>
            <Field label="Tên đăng nhập">
              <TextInput name="username" autoComplete="off" required />
            </Field>
            <Field label="Mật khẩu" hint={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`}>
              <TextInput name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label="Nhập lại mật khẩu">
              <TextInput name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </ActionForm>
        </section>

        <section className={cardClass + " p-4"}>
          <h2 className="mb-3 font-display text-lg font-semibold">Đổi mật khẩu của bạn</h2>
          <ActionForm action={changePasswordAction} submitLabel="Đổi mật khẩu" resetOnSuccess>
            <Field label="Mật khẩu hiện tại">
              <TextInput name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Mật khẩu mới">
              <TextInput name="password" type="password" autoComplete="new-password" required />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <TextInput name="confirm" type="password" autoComplete="new-password" required />
            </Field>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
