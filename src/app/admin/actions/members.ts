"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import {
  EQUIPMENT_SLOTS,
  HOLDERS,
  MAX_STATS_LENGTH,
  MAX_STATS_LINES,
  REFINE_MAX,
  REFINE_MIN,
  UPGRADE_MAX,
  UPGRADE_MIN,
  type Equipment,
  type Holder,
} from "@/lib/equipment";
import {
  MEMBER_CLASSES,
  createMember,
  deleteMember,
  duplicateMember,
  saveAppearance,
  saveEquipment,
  updateMemberInfo,
} from "@/lib/members";
import { ROLE_ICONS } from "@/lib/roles";
import { FormError, handleForm, idList, intOrNull, intRequired, text, textOrNull, type FormState } from "./form";

const MAX_ICON_ID = 1_000_000;

function assertHolder(holder: string): asserts holder is Holder {
  if (!HOLDERS.includes(holder as Holder)) throw new FormError("Sai thân");
}

export async function createMemberAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let id = 0;
  const state = await handleForm(async () => {
    const name = text(fd, "character_name");
    if (!name) throw new FormError("Nhập tên nhân vật");
    id = await createMember(name);
    return null;
  });
  if (state) return state;
  revalidatePath("/", "layout");
  redirect(`/admin/members/${id}`);
}

export async function updateMemberInfoAction(memberId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    const name = text(fd, "character_name");
    if (!name) throw new FormError("Nhập tên nhân vật");
    const klass = textOrNull(fd, "class");
    if (klass && !(MEMBER_CLASSES as readonly string[]).includes(klass)) throw new FormError("Phái không hợp lệ");
    const icon = intOrNull(fd, "icon", "Chức vụ", 1, MAX_ICON_ID);
    if (icon !== null && !ROLE_ICONS.some((r) => r.icon === icon)) throw new FormError("Chức vụ không hợp lệ");
    const skills = idList(text(fd, "skill_ids"), "Kỹ năng");
    await updateMemberInfo(memberId, {
      character_name: name,
      owner: textOrNull(fd, "owner"),
      class: klass,
      level: intOrNull(fd, "level", "Cấp độ", 0, 999),
      pt: intOrNull(fd, "pt", "PT", 0, 999),
      icon,
      avatar_id: intOrNull(fd, "avatar_id", "ID avatar", 1, MAX_ICON_ID),
      skill_ids: skills.length > 0 ? skills.join(", ") : null,
    });
    revalidatePath("/", "layout");
    return { message: "Đã lưu thông tin" };
  });
}

/**
 * Saves one holder's (main body or clone) look and gear together.
 * Appearance fields: `head`, `body`, `leg`, `yoroi` (sprite ids, blank = none);
 * `stats`: the info box's free-text lines.
 * Per slot: `<slot>_icon` (blank = empty slot), `<slot>_upgrade` (-1..16)
 * and `<slot>_refine` (-1..9).
 */
export async function saveHolderAction(
  memberId: number,
  holder: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    assertHolder(holder);
    const sprite = (name: string) => intOrNull(fd, name, "Sprite", 1, Number.MAX_SAFE_INTEGER);
    const appearance = { head: sprite("head"), body: sprite("body"), leg: sprite("leg"), yoroi: sprite("yoroi") };
    const equipment: Equipment = {};
    for (const slot of EQUIPMENT_SLOTS) {
      const icon = intOrNull(fd, `${slot.key}_icon`, `ID ${slot.name}`, 1, MAX_ICON_ID);
      if (icon === null) continue;
      equipment[slot.key] = {
        icon,
        upgrade: intRequired(fd, `${slot.key}_upgrade`, `Cấp + ${slot.name}`, UPGRADE_MIN, UPGRADE_MAX),
        refine: intRequired(fd, `${slot.key}_refine`, `Tinh luyện ${slot.name}`, REFINE_MIN, REFINE_MAX),
      };
    }
    // Info-box stat lines: free text, one per line, blank lines dropped.
    const statLines = (typeof fd.get("stats") === "string" ? (fd.get("stats") as string) : "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (statLines.length > MAX_STATS_LINES) throw new FormError(`Tối đa ${MAX_STATS_LINES} dòng chỉ số`);
    const stats = statLines.join("\n");
    if (stats.length > MAX_STATS_LENGTH) throw new FormError(`Chỉ số tối đa ${MAX_STATS_LENGTH} ký tự`);
    await saveAppearance(memberId, holder, appearance, stats || null);
    await saveEquipment(memberId, holder, equipment);
    revalidatePath("/", "layout");
    return { message: "Đã lưu" };
  });
}

export async function duplicateMemberAction(memberId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  let newId = 0;
  const state = await handleForm(async () => {
    const name = text(fd, "character_name");
    if (!name) throw new FormError("Nhập tên cho bản sao");
    newId = await duplicateMember(memberId, name);
    return null;
  });
  if (state) return state;
  revalidatePath("/", "layout");
  redirect(`/admin/members/${newId}`);
}

export async function deleteMemberAction(memberId: number): Promise<FormState> {
  await requireAdmin();
  const state = await handleForm(async () => {
    try {
      await deleteMember(memberId);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("Thành viên đã có trận")) throw new FormError(err.message);
      throw err;
    }
    return null;
  });
  if (state) return state;
  revalidatePath("/", "layout");
  redirect("/admin/members");
}
