import { getDb } from "./db";
import { fetchSheetValues } from "./googleSheets";

const SPREADSHEET_ID = "11pQH1dm0A5iyHvMGL6SrK72OgVpa8mu6dNlxigHs5wQ";
// Chủ, Nhân vật, Class, Cấp độ, Phân thân, Icon, ID Avatar, ID Skill, ID Items
const SHEET_RANGE = "'Thành viên'!A2:I";

export interface Member {
  id: number;
  character_name: string;
  owner: string | null;
  class: string | null;
  level: string | null;
  pt: string | null;
  note: string | null;
  icon: number | null;
  avatar_id: number | null;
  skill_ids: string | null;
  item_ids: string | null;
  elo: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  /** elo_change of this member's most recent match, or null if they haven't played one. */
  last_elo_change: number | null;
}

/** "2228, 607, 1295" -> [2228, 607, 1295]. Sheet cell can be blank or missing. */
export function parseIdList(raw: string | null | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
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
  const row = await db.prepare("SELECT * FROM members WHERE id = ?").bind(id).first<Member>();
  return row ?? undefined;
}

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

function toIntOrNull(raw: string | undefined): number | null {
  const n = Number(raw?.trim());
  return raw && Number.isFinite(n) && n > 0 ? n : null;
}

export async function importMembersFromSheet(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  const rows = await fetchSheetValues(SPREADSHEET_ID, SHEET_RANGE);
  const db = await getDb();

  const findExisting = db.prepare("SELECT id FROM members WHERE character_name = ?");
  const upsert = db.prepare(`
    INSERT INTO members (character_name, owner, class, level, pt, icon, avatar_id, skill_ids, item_ids)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    ON CONFLICT(character_name) DO UPDATE SET
      owner = excluded.owner,
      class = excluded.class,
      level = excluded.level,
      pt = excluded.pt,
      icon = excluded.icon,
      avatar_id = excluded.avatar_id,
      skill_ids = excluded.skill_ids,
      item_ids = excluded.item_ids,
      updated_at = datetime('now')
  `);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const [owner, characterName, klass, level, pt, icon, avatarId, skillIds, itemIds] = row;
    if (!characterName || !characterName.trim()) {
      skipped++;
      continue;
    }

    const existing = await findExisting.bind(characterName).first();
    await upsert
      .bind(
        characterName.trim(),
        owner?.trim() ?? "",
        klass?.trim() ?? "",
        level?.trim() ?? "",
        pt?.trim() ?? "",
        toIntOrNull(icon),
        toIntOrNull(avatarId),
        skillIds?.trim() || null,
        itemIds?.trim() || null,
      )
      .run();

    if (existing) updated++;
    else inserted++;
  }

  return { inserted, updated, skipped };
}
