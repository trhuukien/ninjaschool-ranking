import { requireAdmin } from "@/lib/auth/session";
import { SPRITE_KINDS, SPRITE_KIND_LABEL, listSprites, type Sprite } from "@/lib/sprites";
import { cardClass } from "@/lib/ui";
import { GameIcon } from "@/components/GameAssets";
import { createSpriteAction, deleteSpriteAction, updateSpriteAction } from "../../actions/sprites";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, Select, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

function SpriteFields({ sprite }: { sprite?: Sprite }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <Field label="Loại">
        <Select name="kind" defaultValue={sprite?.kind ?? "head"}>
          {SPRITE_KINDS.map((k) => (
            <option key={k} value={k}>
              {SPRITE_KIND_LABEL[k]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Tên">
        <TextInput name="name" defaultValue={sprite?.name ?? ""} required maxLength={64} />
      </Field>
      <Field label="ID khung hình" hint="Nhiều ID = chạy lần lượt">
        <TextInput name="frames" defaultValue={sprite?.frames.join(", ") ?? ""} required />
      </Field>
      <Field label="Lệch X" hint="Yoroi: tính theo mép phải">
        <TextInput name="offset_x" type="number" defaultValue={sprite?.offsetX ?? 0} required />
      </Field>
      <Field label="Lệch Y">
        <TextInput name="offset_y" type="number" defaultValue={sprite?.offsetY ?? 0} required />
      </Field>
    </div>
  );
}

export default async function AdminSpritesPage() {
  await requireAdmin();
  const sprites = await listSprites();

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Sprite nhân vật</PageTitle>
      <p className="text-sm text-muted">
        Các mảnh ghép nhân vật đứng. Độ lệch tính bằng pixel sprite so với góc trên-trái của thân (thân chuẩn đặt ở
        0, 66). Ví dụ chân chuẩn 24, 107; đầu tóc đen 16, 0; Yoroi lấy mép phải 94, trên 60.
      </p>

      <section className={cardClass + " p-4"}>
        <h2 className="mb-3 font-display text-lg font-semibold">Thêm sprite</h2>
        <ActionForm action={createSpriteAction} submitLabel="Thêm" resetOnSuccess>
          <SpriteFields />
        </ActionForm>
      </section>

      {sprites.map((s) => (
        <section key={s.id} className={cardClass + " flex flex-col gap-3 p-4"}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-surface-raised px-2 py-0.5 text-xs text-muted">{SPRITE_KIND_LABEL[s.kind]}</span>
            <span className="font-medium">{s.name}</span>
            <div className="ml-auto flex items-end gap-1 rounded bg-[#662200] p-1">
              {s.frames.map((id, i) => (
                <GameIcon key={`${id}-${i}`} id={id} className="h-12 w-auto max-w-24" />
              ))}
            </div>
          </div>
          <ActionForm action={updateSpriteAction.bind(null, s.id)} submitLabel="Lưu">
            <SpriteFields sprite={s} />
          </ActionForm>
          <ActionForm
            action={deleteSpriteAction.bind(null, s.id)}
            submitLabel="Xoá sprite"
            pendingLabel="Đang xoá..."
            confirm={`Xoá sprite "${s.name}"? Nhân vật đang dùng sẽ mất phần này.`}
            danger
          />
        </section>
      ))}
    </div>
  );
}
