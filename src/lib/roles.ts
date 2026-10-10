// Clan roles and their badge icon in the game's assets. members.icon stores
// the icon id.
export const ROLE_ICONS = [
  { icon: 1216, label: "Tộc Trưởng" },
  { icon: 1215, label: "Tộc Phó" },
  { icon: 1217, label: "Trưởng Lão" },
  { icon: 1121, label: "Thành viên" },
] as const;

export const ROLE_LABEL: Record<number, string> = Object.fromEntries(ROLE_ICONS.map((r) => [r.icon, r.label]));
