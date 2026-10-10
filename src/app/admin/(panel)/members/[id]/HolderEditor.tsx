"use client";

import { useMemo, useState } from "react";
import { HolderWindow } from "@/components/EquipmentPanels";
import { WINDOW_WIDTH } from "@/components/EquipmentPanel";
import {
  EQUIPMENT_SLOTS,
  MAX_STATS_LINES,
  REFINE_MAX,
  REFINE_MIN,
  UPGRADE_MAX,
  UPGRADE_MIN,
  infoLines,
  type Equipment,
  type Holder,
  type SlotKey,
} from "@/lib/equipment";
import type { Appearance, AppearanceIds } from "@/lib/members";
import { SPRITE_KINDS, SPRITE_KIND_LABEL, type Sprite } from "@/lib/sprites";
import type { FormState } from "../../../actions/form";
import { ActionForm } from "../../../ActionForm";

type SlotDraft = { icon: string; upgrade: number; refine: number };

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const UPGRADES = range(UPGRADE_MIN, UPGRADE_MAX);
const REFINES = range(REFINE_MIN, REFINE_MAX);

const STATS_PLACEHOLDER = [
  "HP: 28221/28221",
  "MP: 21875/21919",
  "Tốc độ: 9",
  "Tấn công: 113711-126345",
  "Hỏa chống: 1858",
  "Băng chống: 2204",
  "Phong chống: 948",
  "Giảm sát thương: 444",
  "Độ chính xác: 2504",
  "Khả năng né đòn: 4226",
  "Chí mạng: 820",
  "Phản đòn cận chiến: 302",
  "Cường khắc: 280",
  "Hạ khắc: 0",
].join("\n");

const compact =
  "h-8 rounded border border-border bg-surface px-1.5 text-xs text-foreground focus:border-accent focus:outline-none";

/**
 * One holder's (main body or clone) look and gear, edited around a live
 * preview of the in-game panel: left-column slots on the left, right-column
 * slots on the right, bottom-row slots underneath. Saves both in one action.
 */
export function HolderEditor({
  action,
  equipment,
  appearanceIds,
  sprites,
  member,
  stats: initialStats,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  /** For the info box's fixed lines (name, level, class, school). */
  member: { name: string; level: number | null; class: string | null; holder: Holder };
  stats: string | null;
  equipment: Equipment;
  appearanceIds: AppearanceIds;
  sprites: Sprite[];
}) {
  const [slots, setSlots] = useState<Record<SlotKey, SlotDraft>>(
    () =>
      Object.fromEntries(
        EQUIPMENT_SLOTS.map((s) => {
          const item = equipment[s.key];
          return [s.key, { icon: item ? String(item.icon) : "", upgrade: item?.upgrade ?? -1, refine: item?.refine ?? -1 }];
        }),
      ) as Record<SlotKey, SlotDraft>,
  );
  const [look, setLook] = useState<AppearanceIds>(appearanceIds);
  const [stats, setStats] = useState(initialStats ?? "");
  const info = infoLines(member.name, member.level, member.class, stats, member.holder);

  const preview = useMemo(() => {
    const eq: Equipment = {};
    for (const s of EQUIPMENT_SLOTS) {
      const d = slots[s.key];
      const icon = Number(d.icon);
      if (Number.isInteger(icon) && icon > 0) eq[s.key] = { icon, upgrade: d.upgrade, refine: d.refine };
    }
    const byId = new Map(sprites.map((s) => [s.id, s]));
    const pick = (id: number | null) => (id ? (byId.get(id) ?? null) : null);
    const appearance: Appearance = {
      head: pick(look.head),
      body: pick(look.body),
      leg: pick(look.leg),
      yoroi: pick(look.yoroi),
    };
    return { eq, appearance };
  }, [slots, look, sprites]);

  const update = (key: SlotKey, patch: Partial<SlotDraft>) =>
    setSlots((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const slotInput = (slot: (typeof EQUIPMENT_SLOTS)[number]) => {
    const d = slots[slot.key];
    return (
      <div key={slot.key} className="flex flex-col gap-0.5">
        <span className="text-[11px] text-muted">{slot.name}</span>
        <div className="flex gap-1">
          <input
            name={`${slot.key}_icon`}
            type="number"
            min={1}
            placeholder="ID"
            value={d.icon}
            onChange={(e) => update(slot.key, { icon: e.target.value })}
            className={compact + " w-[4.5rem]"}
          />
          <select
            name={`${slot.key}_upgrade`}
            value={d.upgrade}
            onChange={(e) => update(slot.key, { upgrade: Number(e.target.value) })}
            className={compact}
            title="Cấp +"
          >
            {UPGRADES.map((n) => (
              <option key={n} value={n}>
                {n < 0 ? "+ —" : `+${n}`}
              </option>
            ))}
          </select>
          <select
            name={`${slot.key}_refine`}
            value={d.refine}
            onChange={(e) => update(slot.key, { refine: Number(e.target.value) })}
            className={compact}
            title="Tinh luyện"
          >
            {REFINES.map((n) => (
              <option key={n} value={n}>
                {n < 0 ? "TL —" : `TL ${n}`}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <ActionForm action={action} submitLabel="Lưu">
      <div className="flex flex-wrap gap-2">
        {SPRITE_KINDS.map((kind) => (
          <label key={kind} className="flex flex-col gap-0.5">
            <span className="text-[11px] text-muted">{SPRITE_KIND_LABEL[kind]}</span>
            <select
              name={kind}
              value={look[kind] ?? ""}
              onChange={(e) => setLook((prev) => ({ ...prev, [kind]: e.target.value ? Number(e.target.value) : null }))}
              className={compact + " min-w-32"}
            >
              <option value="">— Không —</option>
              {sprites
                .filter((s) => s.kind === kind)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>

      <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:justify-center">
        <div className="flex flex-col gap-2 lg:mt-16">
          {EQUIPMENT_SLOTS.filter((s) => s.area === "left").map(slotInput)}
        </div>
        <div className="w-full shrink-0" style={{ maxWidth: WINDOW_WIDTH }}>
          <HolderWindow equipment={preview.eq} appearance={preview.appearance} info={info} />
        </div>
        <div className="flex flex-col gap-2 lg:mt-16">
          {EQUIPMENT_SLOTS.filter((s) => s.area === "right").map(slotInput)}
        </div>
      </div>

      <div className="grid grid-cols-1 justify-items-center gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EQUIPMENT_SLOTS.filter((s) => s.area === "bottom").map(slotInput)}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] text-muted">
          Chỉ số trong khung vàng — mỗi dòng một chỉ số, tối đa {MAX_STATS_LINES} dòng (5 dòng đầu: tên, hiếu chiến,
          trình độ, lớp, trường tự điền)
        </span>
        <textarea
          name="stats"
          value={stats}
          onChange={(e) => setStats(e.target.value)}
          rows={8}
          placeholder={STATS_PLACEHOLDER}
          className={compact + " h-auto py-1.5 font-mono"}
        />
      </label>
    </ActionForm>
  );
}
