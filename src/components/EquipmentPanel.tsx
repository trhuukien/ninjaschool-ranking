"use client";

import { useRef, useState } from "react";
import { GameIcon } from "@/components/GameAssets";
import {
  BOTTOM_SLOTS_WITH_REFINE,
  EQUIPMENT_SLOTS,
  type Equipment,
  type EquippedItem,
  type InfoLine,
} from "@/lib/equipment";
import type { Appearance } from "@/lib/members";
import type { Sprite } from "@/lib/sprites";
import { FRAME_EDGE, FrameOrnaments } from "@/components/EquipmentFrame";

// Replica of the in-game "Trang bị" screen. Colours are sampled from it.
const PANEL_BG = "#662200";
const FRAME_ORANGE = "#c8862e";
/** The in-game window's width; narrow enough that the bottom row's six slots sit close together. */
export const WINDOW_WIDTH = 360;
const INFO_CYAN = "#1ad8ff";
const SLOT_BG = "#2e0d04";
const EXTRA_SLOT_BG = "#001919";
const EXTRA_EMPTY_BG = "#000000";

// The game's dark speckle sprite drawn behind every equipped item.
const ITEM_SHADOW_ICON = 154;
const ITEM_SHADOW_SIZE = { width: 62, height: 68 };
// The sprite's first 2 rows hold only a black bar the game never shows; row 3
// is empty, so cutting 3 keeps the bar from peeking through at fractional
// scales (e.g. 125% Windows display scaling).
const ITEM_SHADOW_CROP_TOP = 3;


const DOT_RED = "#fe0019";
const DOT_PURPLE = "#cd00fe";
const DOT_GREEN = "#00b200";
const DOT_BLUE = "#0050ff";

// "+N" upgrade -> slot fill and the dots that circle the slot (one colour
// each, in quarter order). Fills are sampled from the game, which darkens the slot one
// step per level below the top of each colour (+13 and +11 are interpolated).
// Levels not listed get a plain slot.
const UPGRADE: Record<number, { bg: string; dots: string[] }> = {
  16: { bg: "#66000a", dots: Array(4).fill(DOT_RED) },
  15: { bg: "#4d0008", dots: Array(3).fill(DOT_RED) },
  14: { bg: "#460033", dots: Array(4).fill(DOT_PURPLE) },
  13: { bg: "#3c0033", dots: Array(3).fill(DOT_PURPLE) },
  12: { bg: "#320033", dots: Array(2).fill(DOT_PURPLE) },
  11: { bg: "#280033", dots: Array(1).fill(DOT_PURPLE) },
  4: { bg: "#092b09", dots: [DOT_GREEN, DOT_BLUE] },
};

// Game speed in ticks per second, like the game's own speed setting.
// Every animation in the panel is counted in ticks, so changing this one
// number speeds up or slows down the dots, the breathing and the title
// arrows together and keeps them in step with each other.
export const GAME_SPEED = 42;
const ticks = (n: number) => `${n / GAME_SPEED}s`;

// One lap of a dot around its slot, 35 ticks per side; the dots hop one step
// per tick like the game instead of gliding.
const ORBIT_TICKS = 140;
// Idle breathing: 14 ticks down, 14 back up, so one lap is exactly 5 breaths.
const BREATHE_TICKS = 28;
// Title arrows: 14 ticks out, 14 back.
const ARROW_TICKS = 28;
// Sprite animations (e.g. the yoroi flutter): each frame shows for 10 ticks.
const SPRITE_FRAME_TICKS = 10;
// Head dots sit on quarter-loop positions, like the game: an odd count
// leaves a quarter empty rather than spreading out evenly.
const DOT_QUARTERS: Record<number, number[]> = {
  1: [0],
  2: [0, 2],
  3: [0, 1, 2],
  4: [0, 1, 2, 3],
};
// Each head dot drags a tail of fading, shrinking dots, one every 1/28 of the loop.
const TRAIL_LENGTH = 6;
const TRAIL_STEP_TICKS = 5;

// Slot edge, the gap between stacked slots, and the bottom row's spacing, in px.
const SLOT = 50;
const GAP = 2;

/** One equipment slot: tier-coloured fill, item over its speckle shadow, and the circling upgrade dots. */
function ItemSlot({
  item,
  name,
  baseBg = SLOT_BG,
  emptyBg = baseBg,
  iconPadding = 10,
  placeholder,
  showRefine = true,
}: {
  item: EquippedItem | undefined;
  name: string;
  baseBg?: string;
  /** Fill when the slot holds nothing (the bottom row goes black). */
  emptyBg?: string;
  iconPadding?: number;
  placeholder?: string;
  /** Show the tinh luyện number in the bottom-right corner (when the item has one). */
  showRefine?: boolean;
}) {
  const tier = item ? UPGRADE[item.upgrade] : undefined;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: SLOT, height: SLOT, background: tier?.bg ?? (item ? baseBg : emptyBg) }}
      title={name}
    >
      {item && (
        // The game's own background sprite, drawn at the same scale as the
        // item icons (64px icon -> SLOT - 2 * iconPadding), the way the game
        // shows it: its top rows (a stray black bar) cropped off, scaled down
        // nearest-neighbour so the speckles stay sparse, and ~20% darker
        // (measured against the in-game screen).
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            width: ITEM_SHADOW_SIZE.width * ((SLOT - 2 * iconPadding) / 64),
            height: (ITEM_SHADOW_SIZE.height - ITEM_SHADOW_CROP_TOP) * ((SLOT - 2 * iconPadding) / 64),
          }}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/icons/game/${ITEM_SHADOW_ICON}.png`}
            alt=""
            className="absolute left-0 max-w-none [image-rendering:pixelated]"
            style={{
              top: -ITEM_SHADOW_CROP_TOP * ((SLOT - 2 * iconPadding) / 64),
              width: ITEM_SHADOW_SIZE.width * ((SLOT - 2 * iconPadding) / 64),
              height: ITEM_SHADOW_SIZE.height * ((SLOT - 2 * iconPadding) / 64),
              filter: "brightness(0.8)",
            }}
          />
        </div>
      )}
      {item ? (
        <div className="relative h-full w-full" style={{ padding: iconPadding }}>
          <GameIcon id={item.icon} alt={name} className="h-full w-full [image-rendering:pixelated]" />
        </div>
      ) : (
        placeholder && (
          <span className="px-0.5 text-center text-[13px] leading-[1.1] text-[#7d7d7d]">{placeholder}</span>
        )
      )}
      {item && showRefine && item.refine >= 0 && (
        <span
          className="absolute text-[11px] font-bold leading-none text-white"
          // Black outline from a text stroke painted behind the fill, so it
          // follows the glyph evenly and leaves the white digit full width.
          style={{ right: 4, bottom: 3, WebkitTextStroke: "2px #000", paintOrder: "stroke fill" }}
        >
          {item.refine}
        </span>
      )}
      {tier && (
        // The dots hug the slot: their track runs half a GAP (1px) outside the
        // edge on every side, so the 2px trail dots sit right against it and
        // the 4px head overlaps it by 1px. Half a GAP each way also puts a
        // slot's bottom track on exactly the next slot's top track, so dots
        // passing each other line up. They sit above neighbouring slots,
        // which would otherwise cover them.
        <div
          className="pointer-events-none absolute"
          style={{ inset: -GAP / 2, zIndex: 10 }}
          aria-hidden
        >
          {DOT_QUARTERS[tier.dots.length].map((quarter, d) =>
            // Trail first (drawn underneath), then the head dot at j = 0.
            // Delays get an extra -ORBIT_TICKS so the trail is already
            // in place on first paint instead of waiting at the corner.
            Array.from({ length: TRAIL_LENGTH + 1 }, (_, k) => {
              const j = TRAIL_LENGTH - k;
              const delay = -(quarter * ORBIT_TICKS) / 4 + j * TRAIL_STEP_TICKS - ORBIT_TICKS;
              const size = j === 0 ? 4 : j <= 3 ? 2 : 1.5;
              return (
                <span
                  key={`${quarter}-${j}`}
                  className="item-orbit-dot"
                  style={{
                    color: tier.dots[d],
                    width: size,
                    height: size,
                    opacity: j === 0 ? 1 : 0.8 - j * 0.1,
                    animationDuration: ticks(ORBIT_TICKS),
                    animationTimingFunction: `steps(${ORBIT_TICKS / 4})`,
                    animationDelay: ticks(delay),
                  }}
                />
              );
            }),
          )}
        </div>
      )}
    </div>
  );
}

// Standing-pose layout: each sprite's offset (from the sprites table) is in
// sprite px relative to the body's top-left, measured against the in-game
// screen. Drawn scaled down to the game window's size (CHAR_SCALE).
// The drawing box around those offsets: room for tall heads above the body
// and a yoroi trailing out to the left, centred on the body.
const CHAR_ORIGIN = { x: 30, y: 30 };
const CHAR_BOX = { width: 160, height: 170 };
const CHAR_SCALE = 0.52;
// Where the feet land, measured from the top of the slot area: just above the
// orange frame, which starts at row 3. 139 is the bottom of the standard leg
// sprite in the body-relative layout.
const LEG_BOTTOM = 139;
const CHAR_FEET_Y = (SLOT + GAP) * 2 - 10;
const CHAR_TOP = CHAR_FEET_Y - LEG_BOTTOM * CHAR_SCALE;
// The game stands the character with its body a little left of the window's
// centre, so the head and legs read as centred (measured: ~4px).
const CHAR_SHIFT_X = -4;

/**
 * Flipbook keyframes for an n-frame loop: visible for the first 1/n, hidden
 * for the rest. Built per frame count because a keyframe offset can't come
 * from a CSS variable; visibility (not opacity) so frames never blend.
 */
function flipbookKeyframes(frames: number) {
  const name = `sprite-frame-${frames}`;
  const css = `@keyframes ${name}{0%{visibility:visible}${100 / frames}%,100%{visibility:hidden}}`;
  return { name, css };
}

/** One sprite placed in the character box, cycling its frames if it has several. */
function SpriteLayer({ sprite, breathe }: { sprite: Sprite; breathe: boolean }) {
  // A yoroi's frames differ in width and hang from one point, so it is pinned
  // by its right edge; everything else by its left edge.
  const anchor =
    sprite.kind === "yoroi"
      ? { right: CHAR_BOX.width - (CHAR_ORIGIN.x + sprite.offsetX) }
      : { left: CHAR_ORIGIN.x + sprite.offsetX };
  const animated = sprite.frames.length > 1;
  return (
    <div
      className={"absolute inset-0" + (breathe ? " char-breathe" : "")}
      style={breathe ? { animationDuration: ticks(BREATHE_TICKS) } : undefined}
    >
      {animated && <style>{flipbookKeyframes(sprite.frames.length).css}</style>}
      {sprite.frames.map((id, i, frames) => (
        <div
          key={`${id}-${i}`}
          className={"absolute" + (animated ? " sprite-frame" : "")}
          style={{
            ...anchor,
            top: CHAR_ORIGIN.y + sprite.offsetY,
            // Each frame is visible for its own 1/n of the loop.
            ...(animated && {
              animationName: flipbookKeyframes(frames.length).name,
              animationDuration: ticks(SPRITE_FRAME_TICKS * frames.length),
              animationDelay: ticks(-SPRITE_FRAME_TICKS * (frames.length - i)),
            }),
          }}
        >
          <GameIcon id={id} className="block max-w-none" />
        </div>
      ))}
    </div>
  );
}

/**
 * A standing character built from separate sprites, in a box of
 * CHAR_BOX x scale. Painted yoroi, leg, head, body (the yoroi hangs behind,
 * the shoulder pads sit over the hair); everything but the legs bobs 1px for
 * the game's idle "breathing". `mirrored` flips it to face left.
 */
export function CharacterFigure({
  appearance,
  scale = CHAR_SCALE,
  mirrored = false,
  className = "",
}: {
  appearance: Appearance;
  scale?: number;
  mirrored?: boolean;
  className?: string;
}) {
  const layers = (["yoroi", "leg", "head", "body"] as const).flatMap((part) => {
    const sprite = appearance[part];
    return sprite && sprite.frames.length > 0 ? [{ part, sprite }] : [];
  });
  if (layers.length === 0) return null;
  return (
    <div
      className={"pointer-events-none relative " + className}
      style={{ width: CHAR_BOX.width * scale, height: CHAR_BOX.height * scale }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{
          width: CHAR_BOX.width,
          height: CHAR_BOX.height,
          transform: mirrored
            ? `translateX(${CHAR_BOX.width * scale}px) scale(${-scale}, ${scale})`
            : `scale(${scale})`,
        }}
      >
        {layers.map(({ part, sprite }) => (
          <SpriteLayer key={part} sprite={sprite} breathe={part !== "leg"} />
        ))}
      </div>
    </div>
  );
}

/** The character standing in the middle of the equipment panel. */
function CharacterSprite({ appearance }: { appearance: Appearance }) {
  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: `calc(50% + ${CHAR_SHIFT_X}px)`, top: CHAR_TOP - CHAR_ORIGIN.y * CHAR_SCALE }}
    >
      <CharacterFigure appearance={appearance} />
    </div>
  );
}

/** Yellow arrow beside the title; nudges outward and back like the game's. */
function TitleArrow({ flip = false, onClick, label }: { flip?: boolean; onClick?: () => void; label?: string }) {
  const arrow = (
    <svg
      viewBox="0 0 12 14"
      className={"h-3.5 w-3 " + (flip ? "title-arrow-right -scale-x-100" : "title-arrow-left")}
      style={{ animationDuration: ticks(ARROW_TICKS) }}
      aria-hidden
    >
      <path d="M0 7 L7 0 L7 4 L12 4 L12 10 L7 10 L7 14 Z" fill="#ffe200" stroke="#7a4a00" strokeWidth="0.8" />
    </svg>
  );
  if (!onClick) return arrow;
  // A generous hit area around the small arrow, for thumbs.
  return (
    <button type="button" onClick={onClick} aria-label={label} className="-m-3 p-3">
      {arrow}
    </button>
  );
}

const LEFT_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "left");
const RIGHT_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "right");
const BOTTOM_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "bottom");

/**
 * The game's grey-framed window: ornaments, the title box with its yellow
 * arrows (buttons when onPrev/onNext are given), and the content below. It
 * stretches to fill its container's height, so stacked windows match.
 */
export function GameWindow({
  title,
  onPrev,
  onNext,
  children,
}: {
  title: string;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative mx-auto mt-3 flex h-[calc(100%-0.75rem)] w-full flex-col px-3 pb-3 pt-1 text-white"
      style={{
        maxWidth: WINDOW_WIDTH,
        background: PANEL_BG,
        fontFamily: "var(--font-game), sans-serif",
        // The 4px grey edge, outermost pixel first; FrameOrnaments line up with it.
        boxShadow: FRAME_EDGE.map((c, i) => `inset 0 0 0 ${i + 1}px ${c}`).join(", "),
      }}
    >
      <FrameOrnaments />

      <div className="mb-2.5 mt-3 flex items-center justify-center gap-5">
        <TitleArrow onClick={onPrev} label="Xem bảng trước" />
        <div className="border-2 border-[#e84c00] bg-[#3d1200] px-6 py-1.5 text-[17px] leading-tight text-[#ffe83a]">
          {title}
        </div>
        <TitleArrow flip onClick={onNext} label="Xem bảng sau" />
      </div>

      {children}
    </div>
  );
}

/** The "Trang bị" tab: gear slots around the standing character. */
export function EquipmentPanel({
  equipment,
  title = "Trang bị",
  appearance,
  onPrev,
  onNext,
}: {
  equipment: Equipment;
  title?: string;
  appearance?: Appearance;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <GameWindow title={title} onPrev={onPrev} onNext={onNext}>
      <div className="relative flex justify-between">
        {/* Orange frame over rows 3-5, between the two slot columns. */}
        <div
          className="pointer-events-none absolute bottom-0 border-2"
          style={{
            borderColor: FRAME_ORANGE,
            top: (SLOT + GAP) * 2,
            left: SLOT + 6,
            right: SLOT + 6,
          }}
          aria-hidden
        />
        {appearance && <CharacterSprite appearance={appearance} />}
        <SlotColumn equipment={equipment} slots={LEFT_SLOTS} />
        <SlotColumn equipment={equipment} slots={RIGHT_SLOTS} />
      </div>

      {/* Bottom row: six separate dark boxes. */}
      <div className="flex justify-between" style={{ marginTop: 6 }}>
        {BOTTOM_SLOTS.map((slot) => (
          <div key={slot.key} className="shrink-0">
            <ItemSlot
              item={equipment[slot.key]}
              name={slot.name}
              baseBg={EXTRA_SLOT_BG}
              emptyBg={EXTRA_EMPTY_BG}
              iconPadding={10}
              placeholder={slot.name.toLowerCase()}
              showRefine={BOTTOM_SLOTS_WITH_REFINE.includes(slot.key)}
            />
          </div>
        ))}
      </div>
    </GameWindow>
  );
}

/**
 * The "Thông tin" tab: the character's info lines in a white-bordered box —
 * white text, class/school in the game's cyan, the name line a size up.
 * Like the game, pressing a line moves the yellow pointer there (it stays
 * after release; none until the first press). Every line keeps room for it
 * so nothing shifts when it appears.
 */
export function InfoPanel({ info, onPrev, onNext }: { info: InfoLine[]; onPrev?: () => void; onNext?: () => void }) {
  const [pressed, setPressed] = useState<number | null>(null);

  // Mouse drag scrolls the box (the scrollbar itself is hidden); touch
  // already scrolls natively by swiping.
  const glide = useRef(0);
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    cancelAnimationFrame(glide.current);
    const box = e.currentTarget;
    const startY = e.clientY;
    const startTop = box.scrollTop;
    // Recent pointer samples, to know how fast the drag was at release.
    let samples: { y: number; t: number }[] = [{ y: e.clientY, t: e.timeStamp }];
    const move = (ev: PointerEvent) => {
      box.scrollTop = startTop - (ev.clientY - startY);
      samples = [...samples, { y: ev.clientY, t: ev.timeStamp }].filter((s) => ev.timeStamp - s.t < 150);
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      // Keep gliding at the release speed, easing out (momentum like a swipe).
      const first = samples[0];
      const dt = ev.timeStamp - first.t;
      let velocity = dt > 0 && dt < 300 ? (first.y - ev.clientY) / dt : 0; // px per ms
      let last = performance.now();
      const step = (now: number) => {
        const elapsed = now - last;
        last = now;
        box.scrollTop += velocity * elapsed;
        velocity *= Math.pow(0.95, elapsed / 16);
        if (Math.abs(velocity) > 0.02) glide.current = requestAnimationFrame(step);
      };
      if (Math.abs(velocity) > 0.05) glide.current = requestAnimationFrame(step);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };
  return (
    <GameWindow title="Thông tin" onPrev={onPrev} onNext={onNext}>
      {/* The lines sit absolutely inside the box, so a long list never makes
          the window taller than the gear tab; it scrolls instead. */}
      <div
        className="relative min-h-24 flex-1 border-2 border-[#f3ead2] bg-[#3a1204]"
        // Inset from the window edges like the game's info box.
        style={{ marginInline: 14, marginBottom: 10 }}
      >
        <div
          className="info-scroll absolute inset-0 cursor-grab select-none overflow-y-auto py-1.5 pl-1 pr-2.5 active:cursor-grabbing"
          onPointerDown={startDrag}
        >
          {info.map((line, i) => (
            <p
              key={i}
              onPointerDown={() => setPressed(i)}
              className={"flex items-center " + (i === 0 ? "text-[17px] leading-[24px]" : "text-[14px] leading-[21px]")}
              style={{ color: line.highlight ? INFO_CYAN : "#ffffff" }}
            >
              <svg
                viewBox="0 0 12 14"
                className={"mr-1 h-3 w-2.5 shrink-0 -scale-x-100 " + (pressed === i ? "" : "invisible")}
                aria-hidden
              >
                <path d="M0 7 L7 0 L7 4 L12 4 L12 10 L7 10 L7 14 Z" fill="#ffe200" stroke="#7a4a00" strokeWidth="0.8" />
              </svg>
              <span className="truncate" style={line.blurred ? { filter: "blur(4px)" } : undefined}>
                {line.text}
              </span>
            </p>
          ))}
        </div>
      </div>
    </GameWindow>
  );
}

function SlotColumn({
  equipment,
  slots,
}: {
  equipment: Equipment;
  slots: (typeof EQUIPMENT_SLOTS)[number][];
}) {
  return (
    <div className="relative flex flex-col" style={{ gap: GAP }}>
      {slots.map((slot) => (
        <ItemSlot key={slot.key} item={equipment[slot.key]} name={slot.name} />
      ))}
    </div>
  );
}
