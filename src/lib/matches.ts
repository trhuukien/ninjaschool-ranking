import { getDb } from "./db";
import { computeMatchElo, type TeamResult, type EloOutcome } from "./elo";

interface MemberRow {
  id: number;
  elo: number;
  games_played: number;
  character_name: string;
  class: string | null;
}

export interface CreateMatchInput {
  teamAIds: number[];
  teamBIds: number[];
  result: TeamResult;
  note?: string;
}

export interface CreateMatchOutcome {
  matchId: number;
  teamA: (EloOutcome & { characterName: string; class: string | null })[];
  teamB: (EloOutcome & { characterName: string; class: string | null })[];
}

export async function createMatch(input: CreateMatchInput): Promise<CreateMatchOutcome> {
  if (input.teamAIds.length === 0 || input.teamBIds.length === 0) {
    throw new Error("Mỗi đội cần ít nhất 1 thành viên");
  }
  if (input.teamAIds.length > 6 || input.teamBIds.length > 6) {
    throw new Error("Mỗi đội tối đa 6 thành viên");
  }
  const overlap = input.teamAIds.filter((id) => input.teamBIds.includes(id));
  if (overlap.length > 0) {
    throw new Error("Một thành viên không thể ở cả hai đội");
  }

  const db = await getDb();
  const getMember = db.prepare(
    "SELECT id, elo, games_played, character_name, class FROM members WHERE id = ?",
  );

  const loadTeam = async (ids: number[]) => {
    const rows: MemberRow[] = [];
    for (const id of ids) {
      const m = await getMember.bind(id).first<MemberRow>();
      if (!m) throw new Error(`Không tìm thấy thành viên #${id}`);
      rows.push(m);
    }
    return rows;
  };

  const teamARows = await loadTeam(input.teamAIds);
  const teamBRows = await loadTeam(input.teamBIds);

  const { teamA, teamB } = computeMatchElo(
    teamARows.map((m) => ({ id: m.id, elo: m.elo, gamesPlayed: m.games_played })),
    teamBRows.map((m) => ({ id: m.id, elo: m.elo, gamesPlayed: m.games_played })),
    input.result,
  );

  const insertMatch = db.prepare(
    `INSERT INTO matches (played_at, result, note) VALUES (datetime('now'), ?1, ?2) RETURNING id`,
  );
  const insertParticipant = db.prepare(`
    INSERT INTO match_participants (match_id, member_id, team, elo_before, elo_after, elo_change)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6)
  `);
  const updateMember = db.prepare(`
    UPDATE members
    SET elo = ?1,
        games_played = games_played + 1,
        wins = wins + ?2,
        losses = losses + ?3,
        draws = draws + ?4,
        updated_at = datetime('now')
    WHERE id = ?5
  `);

  // D1 has no interactive BEGIN/COMMIT session over HTTP — `batch` is its
  // equivalent for an atomic multi-statement write, but every statement's
  // params (including the new match's id) must be known up front. So the
  // match row is inserted first on its own, then every participant/member
  // write batches together in one atomic call.
  const matchRow = await insertMatch.bind(input.result, input.note ?? null).first<{ id: number }>();
  const matchId = matchRow!.id;

  const winA = input.result === "A" ? 1 : 0;
  const lossA = input.result === "B" ? 1 : 0;
  const drawA = input.result === "DRAW" ? 1 : 0;

  const statements = [
    ...teamA.map((r) =>
      insertParticipant.bind(matchId, r.id, "A", r.eloBefore, r.eloAfter, r.eloChange),
    ),
    ...teamB.map((r) =>
      insertParticipant.bind(matchId, r.id, "B", r.eloBefore, r.eloAfter, r.eloChange),
    ),
    ...teamA.map((r) => updateMember.bind(r.eloAfter, winA, lossA, drawA, r.id)),
    ...teamB.map((r) => updateMember.bind(r.eloAfter, lossA, winA, drawA, r.id)),
  ];
  await db.batch(statements);

  const rowById = new Map([...teamARows, ...teamBRows].map((m) => [m.id, m]));

  return {
    matchId,
    teamA: teamA.map((r) => ({
      ...r,
      characterName: rowById.get(r.id)!.character_name,
      class: rowById.get(r.id)!.class,
    })),
    teamB: teamB.map((r) => ({
      ...r,
      characterName: rowById.get(r.id)!.character_name,
      class: rowById.get(r.id)!.class,
    })),
  };
}

export interface MatchListRow {
  id: number;
  played_at: string;
  result: TeamResult;
  note: string | null;
  teamA: { id: number; character_name: string; class: string | null; avatar_id: number | null; elo_before: number; elo_change: number }[];
  teamB: { id: number; character_name: string; class: string | null; avatar_id: number | null; elo_before: number; elo_change: number }[];
}

export async function listMatches(limit = 50): Promise<MatchListRow[]> {
  const db = await getDb();
  const { results: matches } = await db
    .prepare("SELECT id, played_at, result, note FROM matches ORDER BY played_at DESC, id DESC LIMIT ?")
    .bind(limit)
    .all<{ id: number; played_at: string; result: TeamResult; note: string | null }>();

  const participantsStmt = db.prepare(`
    SELECT mp.team, mp.elo_before, mp.elo_change, mem.id as id, mem.character_name, mem.class, mem.avatar_id
    FROM match_participants mp
    JOIN members mem ON mem.id = mp.member_id
    WHERE mp.match_id = ?
  `);

  const out: MatchListRow[] = [];
  for (const m of matches) {
    const { results: rows } = await participantsStmt.bind(m.id).all<{
      team: "A" | "B";
      elo_before: number;
      elo_change: number;
      id: number;
      character_name: string;
      class: string | null;
      avatar_id: number | null;
    }>();
    const project = (r: (typeof rows)[number]) => ({
      id: r.id,
      character_name: r.character_name,
      class: r.class,
      avatar_id: r.avatar_id,
      elo_before: r.elo_before,
      elo_change: r.elo_change,
    });
    out.push({
      ...m,
      teamA: rows.filter((r) => r.team === "A").map(project),
      teamB: rows.filter((r) => r.team === "B").map(project),
    });
  }
  return out;
}
