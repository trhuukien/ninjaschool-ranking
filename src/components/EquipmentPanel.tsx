import { GameIcon } from "@/components/GameAssets";
import {
  BOTTOM_SLOTS_WITH_REFINE,
  EQUIPMENT_SLOTS,
  type Equipment,
  type EquippedItem,
} from "@/lib/equipment";
import type { Appearance } from "@/lib/members";
import type { Sprite } from "@/lib/sprites";
import { FRAME_EDGE, FrameOrnaments } from "@/components/EquipmentFrame";

// Replica of the in-game "Trang bị" screen. Colours are sampled from it.
const PANEL_BG = "#662200";
const FRAME_ORANGE = "#c8862e";
const SLOT_BG = "#2e0d04";
const EXTRA_SLOT_BG = "#001919";
const EXTRA_EMPTY_BG = "#000000";

// Crisp 1px black outline (all 8 directions) for the white tinh luyện number.
const OUTLINE_1PX = [-1, 0, 1]
  .flatMap((x) => [-1, 0, 1].map((y) => [x, y]))
  .filter(([x, y]) => x || y)
  .map(([x, y]) => `${x}px ${y}px 0 #000`)
  .join(", ");

// The game's dark speckle sprite drawn behind every equipped item.
const ITEM_SHADOW_ICON = 154;


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
  shadow = true,
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
  /** Draw the dark speckle sprite behind the item, as the game does for gear. */
  shadow?: boolean;
}) {
  const tier = item ? UPGRADE[item.upgrade] : undefined;
  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: SLOT, height: SLOT, background: tier?.bg ?? (item ? baseBg : emptyBg) }}
      title={name}
    >
      {item && shadow && (
        <div
          className="absolute"
          // Only a thin dark fringe around the item, like the game: the sprite is
          // darkened (it has light speckles of its own) and scaled past the box
          // so the stray mark in its top-left corner is clipped off.
          style={{
            inset: 9,
            background: `url(/icons/game/${ITEM_SHADOW_ICON}.png) center / 120% no-repeat`,
            filter: "brightness(0.45) saturate(0.3)",
            opacity: 0.8,
          }}
          aria-hidden
        />
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
          style={{ right: 4, bottom: 3, textShadow: OUTLINE_1PX }}
        >
          {item.refine}
        </span>
      )}
      {tier && (
        // The dots run just outside the slot, offset up-left like the game:
        // 2px out on the top/left, on the edge at the bottom/right. With the
        // 2px GAP that puts a slot's bottom track on exactly the same row as
        // the next slot's top track, so dots passing each other line up.
        // They sit above neighbouring slots, which would otherwise cover them.
        <div
          className="pointer-events-none absolute"
          style={{ top: -GAP, left: -GAP, right: 0, bottom: 0, zIndex: 10 }}
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
 * The character standing in the middle of the panel, built from separate
 * sprites. Painted yoroi, leg, head, body (the yoroi hangs behind, the
 * shoulder pads sit over the hair); everything but the legs bobs 1px for the
 * game's idle "breathing".
 */
function CharacterSprite({ appearance }: { appearance: Appearance }) {
  const layers = (["yoroi", "leg", "head", "body"] as const).flatMap((part) => {
    const sprite = appearance[part];
    return sprite && sprite.frames.length > 0 ? [{ part, sprite }] : [];
  });
  if (layers.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2"
      style={{
        left: `calc(50% + ${CHAR_SHIFT_X}px)`,
        top: CHAR_TOP - CHAR_ORIGIN.y * CHAR_SCALE,
        width: CHAR_BOX.width * CHAR_SCALE,
        height: CHAR_BOX.height * CHAR_SCALE,
      }}
    >
      <div
        className="relative origin-top-left"
        style={{ width: CHAR_BOX.width, height: CHAR_BOX.height, transform: `scale(${CHAR_SCALE})` }}
      >
        {layers.map(({ part, sprite }) => (
          <SpriteLayer key={part} sprite={sprite} breathe={part !== "leg"} />
        ))}
      </div>
    </div>
  );
}

/** Yellow arrow beside the title; nudges outward and back like the game's. */
function TitleArrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 12 14"
      className={"h-3.5 w-3 " + (flip ? "title-arrow-right -scale-x-100" : "title-arrow-left")}
      style={{ animationDuration: ticks(ARROW_TICKS) }}
      aria-hidden
    >
      <path d="M0 7 L7 0 L7 4 L12 4 L12 10 L7 10 L7 14 Z" fill="#ffe200" stroke="#7a4a00" strokeWidth="0.8" />
    </svg>
  );
}

const LEFT_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "left");
const RIGHT_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "right");
const BOTTOM_SLOTS = EQUIPMENT_SLOTS.filter((s) => s.area === "bottom");

export function EquipmentPanel({
  equipment,
  title = "Trang bị",
  appearance,
}: {
  equipment: Equipment;
  title?: string;
  appearance?: Appearance;
}) {
  return (
    <div
      className="relative mx-auto mt-3 w-full max-w-[372px] px-3 pb-3 pt-1 text-white"
      style={{
        background: PANEL_BG,
        // The 4px grey edge, outermost pixel first; FrameOrnaments line up with it.
        boxShadow: FRAME_EDGE.map((c, i) => `inset 0 0 0 ${i + 1}px ${c}`).join(", "),
      }}
    >
      <FrameOrnaments />

      <div className="mb-2.5 mt-3 flex items-center justify-center gap-5">
        <TitleArrow />
        <div className="border-2 border-[#e84c00] bg-[#3d1200] px-6 py-1.5 text-[17px] leading-tight text-[#ffe83a]">
          {title}
        </div>
        <TitleArrow flip />
      </div>

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
              shadow={false}
            />
          </div>
        ))}
      </div>
    </div>
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
