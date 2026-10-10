import { getDb } from "./db";
import { computeMatchElo, type TeamResult, type EloOutcome } from "./elo";

const START_ELO = 1000;

export interface CreateMatchInput {
  teamAIds: number[];
  teamBIds: number[];
  result: TeamResult;
  note?: string;
  createdBy: number;
}

export interface CreateMatchOutcome {
  matchId: number;
  teamA: (EloOutcome & { characterName: string; class: string | null })[];
  teamB: (EloOutcome & { characterName: string; class: string | null })[];
}

/**
 * Replays every match in play order from a fresh 1000 for everyone, then
 * writes back each participant's before/after/change and each member's
 * totals. Any change to history (new, edited or deleted match) goes through
 * here, so the ranking always equals what the full history implies.
 *
 * Fixed 5 queries however long the history is: the updates are single
 * UPDATE ... FROM json_each statements, which keeps well inside D1's
 * per-request query limit.
 */
export async function recomputeElo(): Promise<void> {
  const db = await getDb();
  const [matchRes, partRes, memberRes] = await db.batch([
    db.prepare("SELECT id, result FROM matches ORDER BY played_at, id"),
    db.prepare("SELECT id, match_id, member_id, team FROM match_participants"),
    db.prepare("SELECT id FROM members"),
  ]);
  const matches = matchRes.results as { id: number; result: TeamResult }[];
  const parts = partRes.results as { id: number; match_id: number; member_id: number; team: "A" | "B" }[];

  const stats = new Map<number, { elo: number; games: number; wins: number; losses: number; draws: number }>();
  for (const m of memberRes.results as { id: number }[]) {
    stats.set(m.id, { elo: START_ELO, games: 0, wins: 0, losses: 0, draws: 0 });
  }

  const partsByMatch = new Map<number, typeof parts>();
  for (const p of parts) {
    const list = partsByMatch.get(p.match_id) ?? [];
    list.push(p);
    partsByMatch.set(p.match_id, list);
  }

  const participantUpdates: { id: number; b: number; a: number; c: number }[] = [];
  for (const match of matches) {
    const mp = partsByMatch.get(match.id) ?? [];
    const side = (team: "A" | "B") =>
      mp
        .filter((p) => p.team === team)
        .map((p) => ({ part: p, rating: stats.get(p.member_id)! }))
        .filter((x) => x.rating);
    const a = side("A");
    const b = side("B");
    if (a.length === 0 || b.length === 0) continue;

    const { teamA, teamB } = computeMatchElo(
      a.map((x) => ({ id: x.part.id, elo: x.rating.elo, gamesPlayed: x.rating.games })),
      b.map((x) => ({ id: x.part.id, elo: x.rating.elo, gamesPlayed: x.rating.games })),
      match.result,
    );
    const apply = (outcomes: EloOutcome[], members: typeof a, team: "A" | "B") => {
      outcomes.forEach((o, i) => {
        const s = members[i].rating;
        s.elo = o.eloAfter;
        s.games += 1;
        if (match.result === "DRAW") s.draws += 1;
        else if (match.result === team) s.wins += 1;
        else s.losses += 1;
        participantUpdates.push({ id: o.id, b: o.eloBefore, a: o.eloAfter, c: o.eloChange });
      });
    };
    apply(teamA, a, "A");
    apply(teamB, b, "B");
  }

  const memberUpdates = [...stats].map(([id, s]) => ({ id, ...s }));
  await db.batch([
    db
      .prepare(
        `UPDATE match_participants
            SET elo_before = json_extract(j.value, '$.b'),
                elo_after = json_extract(j.value, '$.a'),
                elo_change = json_extract(j.value, '$.c')
           FROM json_each(?1) AS j
          WHERE match_participants.id = json_extract(j.value, '$.id')`,
      )
      .bind(JSON.stringify(participantUpdates)),
    db
      .prepare(
        `UPDATE members
            SET elo = json_extract(j.value, '$.elo'),
                games_played = json_extract(j.value, '$.games'),
                wins = json_extract(j.value, '$.wins'),
                losses = json_extract(j.value, '$.losses'),
                draws = json_extract(j.value, '$.draws')
           FROM json_each(?1) AS j
          WHERE members.id = json_extract(j.value, '$.id')`,
      )
      .bind(JSON.stringify(memberUpdates)),
  ]);
}

function validateTeams(teamAIds: number[], teamBIds: number[]) {
  if (teamAIds.length === 0 || teamBIds.length === 0) {
    throw new Error("Mỗi đội cần ít nhất 1 thành viên");
  }
  if (teamAIds.length > 6 || teamBIds.length > 6) {
    throw new Error("Mỗi đội tối đa 6 thành viên");
  }
  if (teamAIds.some((id) => teamBIds.includes(id))) {
    throw new Error("Một thành viên không thể ở cả hai đội");
  }
  if (new Set([...teamAIds, ...teamBIds]).size !== teamAIds.length + teamBIds.length) {
    throw new Error("Một thành viên bị chọn hai lần");
  }
}

export async function createMatch(input: CreateMatchInput): Promise<CreateMatchOutcome> {
  validateTeams(input.teamAIds, input.teamBIds);
  const db = await getDb();

  const ids = [...input.teamAIds, ...input.teamBIds];
  const known = await db
    .prepare("SELECT COUNT(*) AS n FROM members WHERE id IN (SELECT value FROM json_each(?))")
    .bind(JSON.stringify(ids))
    .first<{ n: number }>();
  if ((known?.n ?? 0) !== ids.length) throw new Error("Có thành viên không tồn tại");

  // The match id must exist before participants can point at it, so it is
  // inserted on its own; elo columns are placeholders until recomputeElo.
  const matchRow = await db
    .prepare(
      `INSERT INTO matches (played_at, result, note, created_by)
       VALUES (datetime('now'), ?1, ?2, ?3) RETURNING id`,
    )
    .bind(input.result, input.note ?? null, input.createdBy)
    .first<{ id: number }>();
  const matchId = matchRow!.id;

  const rows = [
    ...input.teamAIds.map((id) => ({ member: id, team: "A" })),
    ...input.teamBIds.map((id) => ({ member: id, team: "B" })),
  ];
  try {
    await db
      .prepare(
        `INSERT INTO match_participants (match_id, member_id, team, elo_before, elo_after, elo_change)
         SELECT ?1, json_extract(value, '$.member'), json_extract(value, '$.team'), 0, 0, 0
           FROM json_each(?2)`,
      )
      .bind(matchId, JSON.stringify(rows))
      .run();
  } catch (err) {
    // Don't leave a match with nobody in it.
    await db.prepare("DELETE FROM matches WHERE id = ?").bind(matchId).run();
    throw err;
  }

  await recomputeElo();

  const { results } = await db
    .prepare(
      `SELECT mp.team, mp.member_id AS id, mp.elo_before, mp.elo_after, mp.elo_change,
              mem.character_name, mem.class
         FROM match_participants mp JOIN members mem ON mem.id = mp.member_id
        WHERE mp.match_id = ?`,
    )
    .bind(matchId)
    .all<{
      team: "A" | "B";
      id: number;
      elo_before: number;
      elo_after: number;
      elo_change: number;
      character_name: string;
      class: string | null;
    }>();
  const project = (r: (typeof results)[number]) => ({
    id: r.id,
    eloBefore: r.elo_before,
    eloAfter: r.elo_after,
    eloChange: r.elo_change,
    characterName: r.character_name,
    class: r.class,
  });
  return {
    matchId,
    teamA: results.filter((r) => r.team === "A").map(project),
    teamB: results.filter((r) => r.team === "B").map(project),
  };
}

export interface UpdateMatchInput {
  result: TeamResult;
  note: string | null;
  /** "YYYY-MM-DD HH:MM:SS" in UTC, as stored. */
  playedAt: string;
}

export async function updateMatch(id: number, input: UpdateMatchInput): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE matches SET result = ?1, note = ?2, played_at = ?3 WHERE id = ?4")
    .bind(input.result, input.note, input.playedAt, id)
    .run();
  await recomputeElo();
}

export async function deleteMatch(id: number): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM matches WHERE id = ?").bind(id).run();
  await recomputeElo();
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
  if (matches.length === 0) return [];

  // Every listed match's participants in one query rather than one per match.
  const { results: rows } = await db
    .prepare(
      `SELECT mp.match_id, mp.team, mp.elo_before, mp.elo_change,
              mem.id AS id, mem.character_name, mem.class, mem.avatar_id
         FROM match_participants mp
         JOIN members mem ON mem.id = mp.member_id
        WHERE mp.match_id IN (SELECT value FROM json_each(?))`,
    )
    .bind(JSON.stringify(matches.map((m) => m.id)))
    .all<{
      match_id: number;
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
  return matches.map((m) => ({
    ...m,
    teamA: rows.filter((r) => r.match_id === m.id && r.team === "A").map(project),
    teamB: rows.filter((r) => r.match_id === m.id && r.team === "B").map(project),
  }));
}
