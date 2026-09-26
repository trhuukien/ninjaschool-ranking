import { getDb } from "./db";
import { computeMatchElo, type TeamResult, type EloOutcome } from "./elo";

interface MemberRow {
  id: number;
  elo: number;
  games_played: number;
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

export function createMatch(input: CreateMatchInput): CreateMatchOutcome {
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

  const db = getDb();
  const getMember = db.prepare(
    "SELECT id, elo, games_played, character_name, class FROM members WHERE id = ?",
  );

  const loadTeam = (ids: number[]) =>
    ids.map((id) => {
      const m = getMember.get(id) as
        | (MemberRow & { character_name: string; class: string | null })
        | undefined;
      if (!m) throw new Error(`Không tìm thấy thành viên #${id}`);
      return m;
    });

  const teamARows = loadTeam(input.teamAIds);
  const teamBRows = loadTeam(input.teamBIds);

  const { teamA, teamB } = computeMatchElo(
    teamARows.map((m) => ({ id: m.id, elo: m.elo, gamesPlayed: m.games_played })),
    teamBRows.map((m) => ({ id: m.id, elo: m.elo, gamesPlayed: m.games_played })),
    input.result,
  );

  const insertMatch = db.prepare(`
    INSERT INTO matches (played_at, result, note)
    VALUES (datetime('now'), @result, @note)
  `);
  const insertParticipant = db.prepare(`
    INSERT INTO match_participants (match_id, member_id, team, elo_before, elo_after, elo_change)
    VALUES (@match_id, @member_id, @team, @elo_before, @elo_after, @elo_change)
  `);
  const updateMember = db.prepare(`
    UPDATE members
    SET elo = @elo,
        games_played = games_played + 1,
        wins = wins + @win,
        losses = losses + @loss,
        draws = draws + @draw,
        updated_at = datetime('now')
    WHERE id = @id
  `);

  const applyResults = (
    outcomes: EloOutcome[],
    team: "A" | "B",
    matchId: number,
    win: number,
    loss: number,
    draw: number,
  ) => {
    for (const r of outcomes) {
      insertParticipant.run({
        match_id: matchId,
        member_id: r.id,
        team,
        elo_before: r.eloBefore,
        elo_after: r.eloAfter,
        elo_change: r.eloChange,
      });
      updateMember.run({ elo: r.eloAfter, id: r.id, win, loss, draw });
    }
  };

  db.exec("BEGIN");
  let matchId: number;
  try {
    const info = insertMatch.run({
      result: input.result,
      note: input.note ?? null,
    });
    matchId = Number(info.lastInsertRowid);

    const winA = input.result === "A" ? 1 : 0;
    const lossA = input.result === "B" ? 1 : 0;
    const drawA = input.result === "DRAW" ? 1 : 0;
    applyResults(teamA, "A", matchId, winA, lossA, drawA);
    applyResults(teamB, "B", matchId, lossA, winA, drawA);

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

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

export function listMatches(limit = 50): MatchListRow[] {
  const db = getDb();
  const matches = db
    .prepare(
      "SELECT id, played_at, result, note FROM matches ORDER BY played_at DESC, id DESC LIMIT ?",
    )
    .all(limit) as { id: number; played_at: string; result: TeamResult; note: string | null }[];

  const participantsStmt = db.prepare(`
    SELECT mp.team, mp.elo_before, mp.elo_change, mem.id as id, mem.character_name, mem.class, mem.avatar_id
    FROM match_participants mp
    JOIN members mem ON mem.id = mp.member_id
    WHERE mp.match_id = ?
  `);

  return matches.map((m) => {
    const rows = participantsStmt.all(m.id) as {
      team: "A" | "B";
      elo_before: number;
      elo_change: number;
      id: number;
      character_name: string;
      class: string | null;
      avatar_id: number | null;
    }[];
    const project = (r: (typeof rows)[number]) => ({
      id: r.id,
      character_name: r.character_name,
      class: r.class,
      avatar_id: r.avatar_id,
      elo_before: r.elo_before,
      elo_change: r.elo_change,
    });
    return {
      ...m,
      teamA: rows.filter((r) => r.team === "A").map(project),
      teamB: rows.filter((r) => r.team === "B").map(project),
    };
  });
}
