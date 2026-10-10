import { getDb } from "./db";

export const SPRITE_KINDS = ["head", "body", "leg", "yoroi"] as const;
export type SpriteKind = (typeof SPRITE_KINDS)[number];

export const SPRITE_KIND_LABEL: Record<SpriteKind, string> = {
  head: "Đầu",
  body: "Thân",
  leg: "Chân",
  yoroi: "Yoroi",
};

export interface Sprite {
  id: number;
  kind: SpriteKind;
  name: string;
  /** Game icon ids played in a loop; one id means no animation. */
  frames: number[];
  /** Sprite px from the body's top-left; for a yoroi offsetX is its right edge. */
  offsetX: number;
  offsetY: number;
}

interface SpriteRow {
  id: number;
  kind: SpriteKind;
  name: string;
  frames: string;
  offset_x: number;
  offset_y: number;
}

function toSprite(row: SpriteRow): Sprite {
  let frames: number[] = [];
  try {
    frames = (JSON.parse(row.frames) as unknown[]).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    // A malformed row just renders nothing.
  }
  return { id: row.id, kind: row.kind, name: row.name, frames, offsetX: row.offset_x, offsetY: row.offset_y };
}

export async function listSprites(): Promise<Sprite[]> {
  const db = await getDb();
  const { results } = await db.prepare("SELECT * FROM sprites ORDER BY kind, name").all<SpriteRow>();
  return results.map(toSprite);
}

export async function getSpritesByIds(ids: number[]): Promise<Map<number, Sprite>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT * FROM sprites WHERE id IN (SELECT value FROM json_each(?))`)
    .bind(JSON.stringify(unique))
    .all<SpriteRow>();
  return new Map(results.map((r) => [r.id, toSprite(r)]));
}

export interface SpriteInput {
  kind: SpriteKind;
  name: string;
  frames: number[];
  offsetX: number;
  offsetY: number;
}

export async function createSprite(input: SpriteInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare("INSERT INTO sprites (kind, name, frames, offset_x, offset_y) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(input.kind, input.name, JSON.stringify(input.frames), input.offsetX, input.offsetY)
    .run();
}

export async function updateSprite(id: number, input: SpriteInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE sprites SET kind = ?1, name = ?2, frames = ?3, offset_x = ?4, offset_y = ?5 WHERE id = ?6")
    .bind(input.kind, input.name, JSON.stringify(input.frames), input.offsetX, input.offsetY, id)
    .run();
}

/** Members wearing it fall back to no sprite for that part (ON DELETE SET NULL). */
export async function deleteSprite(id: number): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM sprites WHERE id = ?").bind(id).run();
}
