import { getDb } from "./db";
import {
  HOLDERS,
  SLOT_KEYS,
  type Equipment,
  type EquippedItem,
  type Holder,
  type SlotKey,
} from "./equipment";
import { getSpritesByIds, type Sprite } from "./sprites";

export const MEMBER_CLASSES = ["Kiếm", "Tiêu", "Kunai", "Cung", "Đao", "Quạt"] as const;

export interface Member {
  id: number;
  character_name: string;
  owner: string | null;
  class: string | null;
  level: number | null;
  pt: number | null;
  icon: number | null;
  avatar_id: number | null;
  skill_ids: string | null;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  /** elo_change of this member's most recent match, or null if they haven't played one. */
  last_elo_change: number | null;
}

/** "2228, 607, 1295" -> [2228, 607, 1295]. */
export function parseIdList(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

const LAST_ELO_CHANGE_SUBQUERY = `
  (SELECT mp.elo_change
     FROM match_participants mp
     JOIN matches mt ON mt.id = mp.match_id
    WHERE mp.member_id = members.id
    ORDER BY mt.played_at DESC, mt.id DESC
    LIMIT 1) AS last_elo_change
`;

export async function listMembers(): Promise<Member[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(`SELECT members.*, ${LAST_ELO_CHANGE_SUBQUERY} FROM members ORDER BY elo DESC, character_name ASC`)
    .all<Member>();
  return results;
}

export async function getMember(id: number): Promise<Member | undefined> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT members.*, ${LAST_ELO_CHANGE_SUBQUERY} FROM members WHERE id = ?`)
    .bind(id)
    .first<Member>();
  return row ?? undefined;
}

export async function getMemberByName(characterName: string): Promise<Member | undefined> {
  const db = await getDb();
  const row = await db
    .prepare(`SELECT members.*, ${LAST_ELO_CHANGE_SUBQUERY} FROM members WHERE character_name = ?`)
    .bind(characterName)
    .first<Member>();
  return row ?? undefined;
}

// ---------------------------------------------------------------------------
// Equipment and appearance

export interface Appearance {
  head: Sprite | null;
  body: Sprite | null;
  leg: Sprite | null;
  yoroi: Sprite | null;
}

/** Sprite ids per part, as stored; null = none. */
export interface AppearanceIds {
  head: number | null;
  body: number | null;
  leg: number | null;
  yoroi: number | null;
}

export interface MemberGear {
  equipment: Record<Holder, Equipment>;
  appearanceIds: Record<Holder, AppearanceIds>;
  appearance: Record<Holder, Appearance>;
}

const EMPTY_IDS: AppearanceIds = { head: null, body: null, leg: null, yoroi: null };

export async function getMemberGear(memberId: number): Promise<MemberGear> {
  const db = await getDb();
  const [equipRes, lookRes] = await db.batch([
    db
      .prepare("SELECT holder, slot, item_icon, upgrade, refine FROM member_equipment WHERE member_id = ?")
      .bind(memberId),
    db
      .prepare(
        `SELECT holder, head_sprite_id, body_sprite_id, leg_sprite_id, yoroi_sprite_id
           FROM member_appearance WHERE member_id = ?`,
      )
      .bind(memberId),
  ]);

  const equipment: Record<Holder, Equipment> = { main: {}, clone: {} };
  for (const r of equipRes.results as {
    holder: Holder;
    slot: SlotKey;
    item_icon: number;
    upgrade: number;
    refine: number;
  }[]) {
    equipment[r.holder][r.slot] = { icon: r.item_icon, upgrade: r.upgrade, refine: r.refine };
  }

  const appearanceIds: Record<Holder, AppearanceIds> = { main: { ...EMPTY_IDS }, clone: { ...EMPTY_IDS } };
  for (const r of lookRes.results as {
    holder: Holder;
    head_sprite_id: number | null;
    body_sprite_id: number | null;
    leg_sprite_id: number | null;
    yoroi_sprite_id: number | null;
  }[]) {
    appearanceIds[r.holder] = {
      head: r.head_sprite_id,
      body: r.body_sprite_id,
      leg: r.leg_sprite_id,
      yoroi: r.yoroi_sprite_id,
    };
  }

  const sprites = await getSpritesByIds(
    HOLDERS.flatMap((h) => Object.values(appearanceIds[h]).filter((id): id is number => id !== null)),
  );
  const resolve = (ids: AppearanceIds): Appearance => ({
    head: ids.head ? (sprites.get(ids.head) ?? null) : null,
    body: ids.body ? (sprites.get(ids.body) ?? null) : null,
    leg: ids.leg ? (sprites.get(ids.leg) ?? null) : null,
    yoroi: ids.yoroi ? (sprites.get(ids.yoroi) ?? null) : null,
  });

  return {
    equipment,
    appearanceIds,
    appearance: { main: resolve(appearanceIds.main), clone: resolve(appearanceIds.clone) },
  };
}

// ---------------------------------------------------------------------------
// Admin writes

export interface MemberInfoInput {
  character_name: string;
  owner: string | null;
  class: string | null;
  level: number | null;
  pt: number | null;
  icon: number | null;
  avatar_id: number | null;
  skill_ids: string | null;
}

export async function createMember(characterName: string): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare("INSERT INTO members (character_name) VALUES (?) RETURNING id")
    .bind(characterName)
    .first<{ id: number }>();
  return row!.id;
}

export async function updateMemberInfo(id: number, input: MemberInfoInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE members SET character_name = ?1, owner = ?2, class = ?3, level = ?4, pt = ?5,
              icon = ?6, avatar_id = ?7, skill_ids = ?8, updated_at = datetime('now')
        WHERE id = ?9`,
    )
    .bind(
      input.character_name,
      input.owner,
      input.class,
      input.level,
      input.pt,
      input.icon,
      input.avatar_id,
      input.skill_ids,
      id,
    )
    .run();
}

/** Replaces a holder's whole equipment set in one atomic batch. */
export async function saveEquipment(memberId: number, holder: Holder, equipment: Equipment): Promise<void> {
  const rows = SLOT_KEYS.flatMap((slot) => {
    const item: EquippedItem | undefined = equipment[slot];
    return item ? [{ slot, icon: item.icon, upgrade: item.upgrade, refine: item.refine }] : [];
  });
  const db = await getDb();
  await db.batch([
    db.prepare("DELETE FROM member_equipment WHERE member_id = ?1 AND holder = ?2").bind(memberId, holder),
    // One statement for every slot, so the write stays a fixed 2 queries.
    db
      .prepare(
        `INSERT INTO member_equipment (member_id, holder, slot, item_icon, upgrade, refine)
         SELECT ?1, ?2, json_extract(value, '$.slot'), json_extract(value, '$.icon'),
                json_extract(value, '$.upgrade'), json_extract(value, '$.refine')
           FROM json_each(?3)`,
      )
      .bind(memberId, holder, JSON.stringify(rows)),
  ]);
}

export async function saveAppearance(memberId: number, holder: Holder, ids: AppearanceIds): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT INTO member_appearance (member_id, holder, head_sprite_id, body_sprite_id, leg_sprite_id, yoroi_sprite_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(member_id, holder) DO UPDATE SET
         head_sprite_id = excluded.head_sprite_id,
         body_sprite_id = excluded.body_sprite_id,
         leg_sprite_id = excluded.leg_sprite_id,
         yoroi_sprite_id = excluded.yoroi_sprite_id`,
    )
    .bind(memberId, holder, ids.head, ids.body, ids.leg, ids.yoroi)
    .run();
}

/**
 * Copies a member's info, appearance and equipment (both holders) to a new
 * member called `newName`. The copy starts with a fresh 1000 Elo and no
 * matches. Returns the new member's id.
 */
export async function duplicateMember(sourceId: number, newName: string): Promise<number> {
  const db = await getDb();
  const row = await db
    .prepare(
      `INSERT INTO members (character_name, owner, class, level, pt, icon, avatar_id, skill_ids)
       SELECT ?1, owner, class, level, pt, icon, avatar_id, skill_ids FROM members WHERE id = ?2
       RETURNING id`,
    )
    .bind(newName, sourceId)
    .first<{ id: number }>();
  if (!row) throw new Error("Không tìm thấy thành viên gốc");
  await db.batch([
    db
      .prepare(
        `INSERT INTO member_appearance (member_id, holder, head_sprite_id, body_sprite_id, leg_sprite_id, yoroi_sprite_id)
         SELECT ?1, holder, head_sprite_id, body_sprite_id, leg_sprite_id, yoroi_sprite_id
           FROM member_appearance WHERE member_id = ?2`,
      )
      .bind(row.id, sourceId),
    db
      .prepare(
        `INSERT INTO member_equipment (member_id, holder, slot, item_icon, upgrade, refine)
         SELECT ?1, holder, slot, item_icon, upgrade, refine FROM member_equipment WHERE member_id = ?2`,
      )
      .bind(row.id, sourceId),
  ]);
  return row.id;
}

/** Refuses while the member still appears in a match: those must go first. */
export async function deleteMember(id: number): Promise<void> {
  const db = await getDb();
  const played = await db
    .prepare("SELECT COUNT(*) AS n FROM match_participants WHERE member_id = ?")
    .bind(id)
    .first<{ n: number }>();
  if ((played?.n ?? 0) > 0) {
    throw new Error("Thành viên đã có trận đấu — xoá các trận đó trước khi xoá thành viên.");
  }
  await db.prepare("DELETE FROM members WHERE id = ?").bind(id).run();
}

// ---------------------------------------------------------------------------

export interface MemberMatchHistoryRow {
  match_id: number;
  played_at: string;
  team: "A" | "B";
  result: "A" | "B" | "DRAW";
  elo_before: number;
  elo_after: number;
  elo_change: number;
}

export async function getMemberMatchHistory(memberId: number): Promise<MemberMatchHistoryRow[]> {
  const db = await getDb();
  const { results } = await db
    .prepare(
      `SELECT m.id as match_id, m.played_at, mp.team, m.result,
              mp.elo_before, mp.elo_after, mp.elo_change
       FROM match_participants mp
       JOIN matches m ON m.id = mp.match_id
       WHERE mp.member_id = ?
       ORDER BY m.played_at DESC, m.id DESC`,
    )
    .bind(memberId)
    .all<MemberMatchHistoryRow>();
  return results;
}
