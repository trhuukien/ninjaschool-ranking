// Class icons are the game's own official assets (public/icons/game/*.png),
// used with permission — not the CC-licensed placeholder set. Do not add
// more of these wholesale; only specific, named assets belong here.

export type Element = "hoa" | "thuy" | "loi";
export type Style = "ngoai" | "noi";

interface ClassDef {
  element: Element;
  style: Style;
  icon: number;
}

interface ClassTheme {
  label: string;
  badge: string;
  bar: string;
  /** Plain colored text, no pill — used where the row itself already carries the color. */
  text: string;
}

// Same hue per element (ties the pair together), but Ngoại công (physical)
// gets the strong/saturated shade and Nội công (internal/qi) gets a lighter
// tint of that same hue — e.g. Kiếm is red, Tiêu is a lighter "hồng" red.
// Tailwind's scanner needs full literal class names, so these can't be
// built from a template string — each of the 6 is spelled out.
const CLASS_THEME: Record<string, ClassTheme> = {
  "Kiếm": {
    label: "Hỏa · Ngoại công",
    badge: "border-red-500/30 bg-red-500/10 text-red-400",
    bar: "border-l-red-500",
    text: "text-red-400",
  },
  "Tiêu": {
    label: "Hỏa · Nội công",
    badge: "border-red-300/30 bg-red-300/10 text-red-300",
    bar: "border-l-red-300",
    text: "text-red-300",
  },
  "Kunai": {
    label: "Thủy · Ngoại công",
    badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
    bar: "border-l-cyan-500",
    text: "text-cyan-400",
  },
  "Cung": {
    label: "Thủy · Nội công",
    badge: "border-cyan-300/30 bg-cyan-300/10 text-cyan-300",
    bar: "border-l-cyan-300",
    text: "text-cyan-300",
  },
  "Đao": {
    label: "Lôi · Ngoại công",
    badge: "border-violet-500/30 bg-violet-500/10 text-violet-400",
    bar: "border-l-violet-500",
    text: "text-violet-400",
  },
  "Quạt": {
    label: "Lôi · Nội công",
    badge: "border-violet-300/30 bg-violet-300/10 text-violet-300",
    bar: "border-l-violet-300",
    text: "text-violet-300",
  },
};

// Small 48x48 flat icons (unlike the old large elemental-creature portraits,
// these are actually square, so they drop cleanly into a pill next to text).
const CLASS_MAP: Record<string, ClassDef> = {
  "Kiếm": { element: "hoa", style: "ngoai", icon: 1182 },
  "Tiêu": { element: "hoa", style: "noi", icon: 1181 },
  "Kunai": { element: "thuy", style: "ngoai", icon: 643 },
  "Cung": { element: "thuy", style: "noi", icon: 645 },
  "Đao": { element: "loi", style: "ngoai", icon: 676 },
  "Quạt": { element: "loi", style: "noi", icon: 1119 },
};

export function getClassInfo(className?: string | null) {
  if (!className) return null;
  const key = className.trim();
  const def = CLASS_MAP[key];
  if (!def) return null;
  return { ...def, ...CLASS_THEME[key] };
}

/** Directional left-border color utility for the given class's element (e.g. accent stripe on a row/card). */
export function elementBarClass(className?: string | null): string {
  const info = getClassInfo(className);
  return info ? info.bar : "border-l-transparent";
}

/** Plain colored text class for the given class, no pill/icon. */
export function elementTextClass(className?: string | null): string {
  const info = getClassInfo(className);
  return info ? info.text : "text-muted";
}

/** Flat colored pill for the "Class" cell — plain Tailwind classes, no background image. */
export function classPillClass(className?: string | null): string {
  const info = getClassInfo(className);
  return info ? "border " + info.badge : "border border-transparent text-muted";
}

/**
 * A character name with its class icon beside it (icon only, no text pill) —
 * used in compact team-member lists where the phase is already conveyed by
 * the column, so each row should show what class this specific character
 * is instead. `align="left"` puts the icon before the text, `align="right"`
 * puts it after (mirrors the same way `PhaseName` in GameAssets.tsx does).
 */
export function ClassName({
  characterClass,
  align = "left",
  iconClassName = "h-4 w-4",
  children,
}: {
  characterClass?: string | null;
  align?: "left" | "right";
  iconClassName?: string;
  children: React.ReactNode;
}) {
  const info = getClassInfo(characterClass);
  return (
    <span className={"inline-flex min-w-0 items-center gap-1.5 " + (align === "right" ? "flex-row-reverse" : "")}>
      {info && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/icons/game/${info.icon}.png`}
          alt=""
          title={characterClass ?? undefined}
          className={iconClassName + " shrink-0 rounded-sm object-contain"}
        />
      )}
      <span className="truncate">{children}</span>
    </span>
  );
}

export function ClassBadge({ className }: { className?: string | null }) {
  const info = getClassInfo(className);
  if (!info) {
    return <span className="text-muted">{className || "—"}</span>;
  }
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap " +
        info.badge
      }
      title={info.label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/icons/game/${info.icon}.png`}
        alt=""
        className="h-4 w-4 shrink-0 rounded-sm object-contain"
      />
      {className}
    </span>
  );
}
