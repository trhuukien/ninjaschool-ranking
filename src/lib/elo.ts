export type TeamResult = "A" | "B" | "DRAW";

export interface PlayerRating {
  id: number;
  elo: number;
  gamesPlayed: number;
}

export interface EloOutcome {
  id: number;
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
}

// How much (in elo points) 1 point of "distance from own team's average"
// shifts an individual's share of the team's rating change.
const WEIGHT_SPREAD = 400;
// Individual share of the team swing is clamped to [0.5x, 1.5x] so no single
// player's change explodes just because their team is very mismatched internally.
const WEIGHT_MIN = 0.5;
const WEIGHT_MAX = 1.5;

function kFactorFor(gamesPlayed: number): number {
  if (gamesPlayed < 20) return 40;
  if (gamesPlayed < 50) return 28;
  return 20;
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(x: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, x));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/**
 * Team-average Elo with per-player weighting.
 *
 * Each team's strength is the average elo of its members, so an intentionally
 * uneven fight (e.g. 2 strong vs 3 weaker) is judged on average skill, not
 * headcount. The team's overall rating swing (standard Elo expected-score
 * formula) is then split across teammates: a player below their own team's
 * average gets a larger share of the swing, a player above it gets a smaller
 * share — carrying a win as the "weak link" earns more, an favorite that
 * still loses is penalized more.
 */
export function computeMatchElo(
  teamA: PlayerRating[],
  teamB: PlayerRating[],
  result: TeamResult,
): { teamA: EloOutcome[]; teamB: EloOutcome[] } {
  if (teamA.length === 0 || teamB.length === 0) {
    throw new Error("Both teams need at least one player");
  }

  const ratingA = average(teamA.map((p) => p.elo));
  const ratingB = average(teamB.map((p) => p.elo));

  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;

  const actualA = result === "A" ? 1 : result === "B" ? 0 : 0.5;
  const actualB = 1 - actualA;

  const applyTeam = (
    team: PlayerRating[],
    teamRating: number,
    expected: number,
    actual: number,
  ): EloOutcome[] =>
    team.map((p) => {
      const k = kFactorFor(p.gamesPlayed);
      const weight = clamp(1 + (teamRating - p.elo) / WEIGHT_SPREAD, WEIGHT_MIN, WEIGHT_MAX);
      const change = k * weight * (actual - expected);
      return {
        id: p.id,
        eloBefore: round2(p.elo),
        eloAfter: round2(p.elo + change),
        eloChange: round2(change),
      };
    });

  return {
    teamA: applyTeam(teamA, ratingA, expectedA, actualA),
    teamB: applyTeam(teamB, ratingB, expectedB, actualB),
  };
}
