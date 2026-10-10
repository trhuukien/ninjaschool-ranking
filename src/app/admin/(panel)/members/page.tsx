import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listMembers } from "@/lib/members";
import { cardClass } from "@/lib/ui";
import { GameIcon, RoleBadge } from "@/components/GameAssets";
import { ClassName } from "@/components/ClassIcon";
import { createMemberAction } from "../../actions/members";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdmin();
  const members = await listMembers();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Thành viên</PageTitle>

      <div className={cardClass + " p-4"}>
        <ActionForm action={createMemberAction} submitLabel="Thêm thành viên" className="flex flex-wrap items-end gap-3">
          <Field label="Tên nhân vật mới" className="min-w-0 flex-1">
            <TextInput name="character_name" required maxLength={64} />
          </Field>
        </ActionForm>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted">Chưa có thành viên nào.</p>
      ) : (
        <div className={cardClass + " divide-y divide-border"}>
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/admin/members/${m.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised"
            >
              {m.avatar_id ? (
                <GameIcon id={m.avatar_id} className="h-9 w-9 shrink-0" />
              ) : (
                <span className="h-9 w-9 shrink-0 rounded bg-surface-raised" />
              )}
              <span className="flex min-w-0 flex-1 items-center gap-2 font-medium">
                <RoleBadge iconId={m.icon} />
                <span className="truncate">{m.character_name}</span>
              </span>
              <ClassName characterClass={m.class}>{m.class || "—"}</ClassName>
              <span className="w-16 text-right font-mono text-sm">{Math.round(m.elo)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
