"use client";

import { useEffect, useState } from "react";

// Official in-game UI assets (public/icons/game/*.png), used with permission —
// only these specific, named files. Do not add more wholesale.

// 930 is dropped: it's a broken/mis-cropped frame (a solid color block), not
// part of the burst. Cross-fading the rest made it worse — most frames share
// a bright core, so overlapping two of them during a fade just reads as a
// held white flash instead of distinct sparkle beats. A hard-cut flipbook
// (real sprite-animation style) reads as a burst; a dissolve doesn't.
const WIN_FX_FRAMES = [926, 927, 928, 929, 931, 932];
const WIN_FX_INTERVAL_MS = 130;

/** Looping burst animation shown on the winning side of a match. */
export function VictoryEffect({ className = "h-10 w-10" }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WIN_FX_FRAMES.length), WIN_FX_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/game/${WIN_FX_FRAMES[index]}.png`}
      alt=""
      className={className + " object-contain pointer-events-none select-none"}
    />
  );
}

const RESULT_ICON = { win: 1118, lose: 1117, draw: 1126 } as const;
export type Outcome = keyof typeof RESULT_ICON;

/** The game's own "Thắng" / "Thua" / "Hòa" result banner. */
export function ResultIcon({
  outcome,
  className = "h-6",
}: {
  outcome: Outcome;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/game/${RESULT_ICON[outcome]}.png`}
      alt={outcome === "win" ? "Thắng" : outcome === "lose" ? "Thua" : "Hòa"}
      className={className + " object-contain"}
    />
  );
}

/** The game's "Tỷ Thí" (duel) badge, used as a VS divider between two sides. */
export function VsIcon({ className = "h-8" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/game/1116.png" alt="Tỷ thí" className={className + " object-contain"} />
  );
}

const PHASE_ICON = { A: 1240, B: 1241 } as const;

/** "Bạch"/"Hắc" (white/black) badge used in place of the "Phe 1"/"Phe 2" text label. */
export function PhaseIcon({
  phase,
  className = "h-6",
}: {
  phase: "A" | "B";
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/game/${PHASE_ICON[phase]}.png`}
      alt={phase === "A" ? "Phe 1 (Bạch)" : "Phe 2 (Hắc)"}
      title={phase === "A" ? "Phe 1 (Bạch)" : "Phe 2 (Hắc)"}
      className={className + " object-contain"}
    />
  );
}

/**
 * A character name with its phase icon beside it — always use this instead
 * of a bare name wherever a name is shown next to which side it's on.
 * `align="left"` puts the icon before the text (for a left-aligned column),
 * `align="right"` puts it after (for a right-aligned/mirrored column).
 */
export function PhaseName({
  phase,
  align = "left",
  iconClassName = "h-4 w-4",
  className = "",
  children,
}: {
  phase: "A" | "B";
  align?: "left" | "right";
  iconClassName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        "inline-flex min-w-0 items-center gap-1.5 " +
        (align === "right" ? "flex-row-reverse " : "") +
        className
      }
    >
      <PhaseIcon phase={phase} className={iconClassName + " shrink-0"} />
      <span className="truncate">{children}</span>
    </span>
  );
}

/** Generic renderer for any game icon by its raw id — avatar, skill, item, etc. */
export function GameIcon({
  id,
  alt = "",
  className = "h-10 w-10",
}: {
  id: number;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/game/${id}.png`}
      alt={alt}
      className={className + " object-contain"}
    />
  );
}

const ROLE_LABEL: Record<number, string> = {
  1216: "Tộc Trưởng",
  1215: "Tộc Phó",
  1217: "Trưởng Lão",
  1121: "Thành viên",
};

/** Clan-role badge — the sheet's own "Icon" column now gives this id directly. */
export function RoleBadge({
  iconId,
  className = "h-5 w-5",
}: {
  iconId?: number | null;
  className?: string;
}) {
  if (!iconId) return null;
  const label = ROLE_LABEL[iconId] ?? "Thành viên";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/game/${iconId}.png`}
      alt={label}
      title={label}
      className={className + " inline-block shrink-0 object-contain"}
    />
  );
}
