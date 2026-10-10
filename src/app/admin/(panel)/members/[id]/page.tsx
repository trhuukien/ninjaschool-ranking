import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { HOLDERS, HOLDER_LABEL } from "@/lib/equipment";
import { MEMBER_CLASSES, getMember, getMemberGear } from "@/lib/members";
import { ROLE_ICONS } from "@/lib/roles";
import { listSprites } from "@/lib/sprites";
import { cardClass } from "@/lib/ui";
import { GameIcon } from "@/components/GameAssets";
import {
  deleteMemberAction,
  duplicateMemberAction,
  saveHolderAction,
  updateMemberInfoAction,
} from "../../../actions/members";
import { HolderEditor } from "./HolderEditor";
import { ActionForm } from "../../../ActionForm";
import { Field, PageTitle, Select, TextInput } from "../../../fields";

export const dynamic = "force-dynamic";

export default async function AdminMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [member, gear, sprites] = await Promise.all([getMember(id), getMemberGear(id), listSprites()]);
  if (!member) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/members" className="text-sm text-muted hover:text-foreground">
          ← Thành viên
        </Link>
        <PageTitle>{member.character_name}</PageTitle>
        <Link
          href={`/members/${encodeURIComponent(member.character_name)}`}
          className="ml-auto text-sm text-accent-strong hover:underline"
        >
          Xem trang công khai →
        </Link>
      </div>

      <section className={cardClass + " p-4"}>
        <h2 className="mb-3 font-display text-lg font-semibold">Thông tin</h2>
        <ActionForm action={updateMemberInfoAction.bind(null, id)} submitLabel="Lưu thông tin">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Tên nhân vật">
              <TextInput name="character_name" defaultValue={member.character_name} required maxLength={64} />
            </Field>
            <Field label="Chủ tài khoản">
              <TextInput name="owner" defaultValue={member.owner ?? ""} maxLength={64} />
            </Field>
            <Field label="Phái">
              <Select name="class" defaultValue={member.class ?? ""}>
                <option value="">—</option>
                {MEMBER_CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cấp độ">
              <TextInput name="level" type="number" min={0} max={999} defaultValue={member.level ?? ""} />
            </Field>
            <Field label="Cấp PT (phân thân)">
              <TextInput name="pt" type="number" min={0} max={999} defaultValue={member.pt ?? ""} />
            </Field>
            <Field label="Chức vụ">
              <Select name="icon" defaultValue={member.icon ?? ""}>
                <option value="">—</option>
                {ROLE_ICONS.map((r) => (
                  <option key={r.icon} value={r.icon}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ID icon avatar">
              <div className="flex items-center gap-2">
                <TextInput
                  name="avatar_id"
                  type="number"
                  min={1}
                  defaultValue={member.avatar_id ?? ""}
                  className="min-w-0 flex-1"
                />
                {member.avatar_id && <GameIcon id={member.avatar_id} className="h-9 w-9" />}
              </div>
            </Field>
            <Field label="ID icon kỹ năng" hint="Cách nhau bằng dấu phẩy, theo thứ tự hiển thị" className="sm:col-span-2">
              <TextInput name="skill_ids" defaultValue={member.skill_ids ?? ""} />
            </Field>
          </div>
        </ActionForm>
      </section>

      {HOLDERS.map((holder) => (
        <section key={holder} className={cardClass + " p-4"}>
          <h2 className="mb-3 font-display text-lg font-semibold">{HOLDER_LABEL[holder]}</h2>
          <HolderEditor
            action={saveHolderAction.bind(null, id, holder)}
            equipment={gear.equipment[holder]}
            appearanceIds={gear.appearanceIds[holder]}
            stats={gear.stats[holder]}
            member={{
              name: member.character_name,
              level: holder === "main" ? member.level : member.pt,
              class: member.class,
              holder,
            }}
            sprites={sprites}
          />
        </section>
      ))}

      <section className={cardClass + " p-4"}>
        <h2 className="mb-1 font-display text-lg font-semibold">Nhân bản</h2>
        <p className="mb-3 text-sm text-muted">
          Tạo thành viên mới với cùng thông tin, bộ dạng và trang bị (cả chủ thân lẫn phân thân), rồi sửa phần khác
          biệt. Elo bắt đầu lại từ 1000.
        </p>
        <ActionForm
          action={duplicateMemberAction.bind(null, id)}
          submitLabel="Nhân bản"
          pendingLabel="Đang nhân bản..."
          className="flex flex-wrap items-end gap-3"
        >
          <Field label="Tên nhân vật mới" className="min-w-0 flex-1">
            <TextInput name="character_name" defaultValue={`${member.character_name} 2`} required maxLength={64} />
          </Field>
        </ActionForm>
      </section>

      <section className={cardClass + " border-red-500/30 p-4"}>
        <h2 className="mb-1 font-display text-lg font-semibold text-red-300">Xoá thành viên</h2>
        <p className="mb-3 text-sm text-muted">
          Chỉ xoá được khi thành viên chưa có trận nào (xoá các trận trước ở mục Trận đấu).
        </p>
        <ActionForm
          action={deleteMemberAction.bind(null, id)}
          submitLabel="Xoá thành viên"
          pendingLabel="Đang xoá..."
          confirm={`Xoá hẳn ${member.character_name}? Không thể hoàn tác.`}
          danger
        />
      </section>
    </div>
  );
}
