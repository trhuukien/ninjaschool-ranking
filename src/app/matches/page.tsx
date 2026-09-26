import Link from "next/link";
import { listMatches } from "@/lib/matches";
import { cardClass } from "@/lib/ui";
import { getClassInfo } from "@/components/ClassIcon";
import { PhaseIcon } from "@/components/GameAssets";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type Player = {
  id: number;
  character_name: string;
  class: string | null;
  elo_before: number;
  elo_change: number;
};
type Match = {
  id: number;
  played_at: string;
  result: "A" | "B" | "DRAW";
  note: string | null;
  teamA: Player[];
  teamB: Player[];
};

interface DayGroup {
  key: string;
  label: string;
  matches: Match[];
}
interface MonthGroup {
  key: string;
  label: string;
  days: DayGroup[];
}

function groupByMonthAndDay(matches: Match[]): MonthGroup[] {
  const months: MonthGroup[] = [];

  for (const m of matches) {
    const d = new Date(m.played_at + "Z");
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    let month = months[months.length - 1]?.key === monthKey ? months[months.length - 1] : undefined;
    if (!month) {
      month = { key: monthKey, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`, days: [] };
      months.push(month);
    }

    let day = month.days[month.days.length - 1]?.key === dayKey ? month.days[month.days.length - 1] : undefined;
    if (!day) {
      day = {
        key: dayKey,
        label: `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
        matches: [],
      };
      month.days.push(day);
    }

    day.matches.push(m);
  }

  return months;
}

export default async function MatchesPage() {
  const matches = await listMatches();
  const months = groupByMonthAndDay(matches);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
          Lịch sử trận đấu
        </h1>
        <Link
          href="/matches/new"
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 hover:bg-accent-strong"
        >
          + Ghi trận đấu
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Chưa có trận đấu nào được ghi lại.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {months.map((month) => (
            <div key={month.key} className="flex flex-col gap-3">
              <h2 className="font-display text-sm font-semibold tracking-wide text-muted">
                {month.label}
              </h2>
              {month.days.map((day) => (
                <div key={day.key} className="flex flex-col gap-2">
                  <p className="text-xs text-muted">{day.label}</p>
                  <div className="flex flex-col gap-2">
                    {day.matches.map((m) => (
                      <MatchCard key={m.id} match={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function teamAvg(players: Player[]): number | null {
  return players.length
    ? Math.round(players.reduce((s, p) => s + p.elo_before, 0) / players.length)
    : null;
}

function MatchCard({ match: m }: { match: Match }) {
  const rows = Math.max(m.teamA.length, m.teamB.length);
  const d = new Date(m.played_at + "Z");
  const time = `${pad(d.getHours())}h${pad(d.getMinutes())}`;

  return (
    <div className={cardClass + " overflow-hidden text-sm"}>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-raised/40 px-3 py-1.5 sm:gap-6">
        <SideSummary phase="A" count={m.teamA.length} avg={teamAvg(m.teamA)} />
        <span className="w-10 shrink-0 text-center font-mono text-[11px] text-white">{time}</span>
        <SideSummary phase="B" count={m.teamB.length} avg={teamAvg(m.teamB)} reverse />
      </div>

      <div className="grid grid-cols-2 divide-x divide-border">
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <PlayerRow key={i} player={m.teamA[i]} />
          ))}
        </div>
        <div>
          {Array.from({ length: rows }).map((_, i) => (
            <PlayerRow key={i} player={m.teamB[i]} />
          ))}
        </div>
      </div>
      {m.note && (
        <p className="border-t border-border px-3 py-1 text-[11px] italic text-muted">{m.note}</p>
      )}
    </div>
  );
}

function SideSummary({
  phase,
  count,
  avg,
  reverse = false,
}: {
  phase: "A" | "B";
  count: number;
  avg: number | null;
  reverse?: boolean;
}) {
  return (
    <div className={"flex items-center gap-1.5" + (reverse ? " flex-row-reverse" : "")}>
      <PhaseIcon phase={phase} className="h-5" />
      <span className={"text-[11px] text-muted" + (reverse ? " text-right" : "")}>
        {count} nhẫn giả{avg !== null ? ` · ${avg}` : ""}
      </span>
    </div>
  );
}

function PlayerRow({ player }: { player?: Player }) {
  if (!player) return <div className="h-8" />;
  const info = getClassInfo(player.class);
  return (
    <div className="flex h-8 items-center gap-1.5 px-3">
      {info && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/icons/game/${info.icon}.png`} alt="" className="h-4 w-4 shrink-0 object-contain" />
      )}
      <Link
        href={`/members/${encodeURIComponent(player.character_name)}`}
        className={"min-w-0 flex-1 truncate font-medium hover:underline " + (info ? info.text : "")}
      >
        {player.character_name}
      </Link>
      <span
        className={
          "shrink-0 font-mono text-xs " +
          (player.elo_change > 0 ? "text-green-400" : player.elo_change < 0 ? "text-red-400" : "text-muted")
        }
      >
        {player.elo_change > 0 ? "+" : ""}
        {player.elo_change}
      </span>
    </div>
  );
}
