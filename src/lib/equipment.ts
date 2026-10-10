// Equipment slots, in the in-game "Trang bị" layout: five down the left,
// five down the right, six along the bottom. Keys match member_equipment.slot.

export const EQUIPMENT_SLOTS = [
  { key: "hat", name: "Nón", area: "left" },
  { key: "armor", name: "Áo", area: "left" },
  { key: "gloves", name: "Găng tay", area: "left" },
  { key: "pants", name: "Quần", area: "left" },
  { key: "boots", name: "Giày", area: "left" },
  { key: "weapon", name: "Vũ khí", area: "right" },
  { key: "necklace", name: "Dây chuyền", area: "right" },
  { key: "ring", name: "Nhẫn", area: "right" },
  { key: "jade", name: "Ngọc bội", area: "right" },
  { key: "charm", name: "Bùa", area: "right" },
  { key: "pet", name: "Thú nuôi", area: "bottom" },
  { key: "mask", name: "Mặt nạ", area: "bottom" },
  { key: "yoroi", name: "Yoroi", area: "bottom" },
  { key: "clan", name: "Gia tộc", area: "bottom" },
  { key: "eye", name: "Mắt", area: "bottom" },
  { key: "book", name: "Bí kíp", area: "bottom" },
] as const;

export type SlotKey = (typeof EQUIPMENT_SLOTS)[number]["key"];
export const SLOT_KEYS = EQUIPMENT_SLOTS.map((s) => s.key) as SlotKey[];

/** The game only shows a tinh luyện number on these bottom-row slots. */
export const BOTTOM_SLOTS_WITH_REFINE: SlotKey[] = ["yoroi"];

export type Holder = "main" | "clone";
export const HOLDERS: Holder[] = ["main", "clone"];
export const HOLDER_LABEL: Record<Holder, string> = { main: "Chủ thân", clone: "Phân thân" };

/** "+N" upgrade: -1 = the item has none, otherwise 0..16. */
export const UPGRADE_MIN = -1;
export const UPGRADE_MAX = 16;
/** Tinh luyện: -1 = the item has none, otherwise 0..9. */
export const REFINE_MIN = -1;
export const REFINE_MAX = 9;

export interface EquippedItem {
  icon: number;
  upgrade: number;
  refine: number;
}

/** A holder's gear keyed by slot; missing keys are empty slots. */
export type Equipment = Partial<Record<SlotKey, EquippedItem>>;
