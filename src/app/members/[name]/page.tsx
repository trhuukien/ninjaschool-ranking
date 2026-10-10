import { notFound } from "next/navigation";
import {
  getMemberByName,
  getMemberGear,
  getMemberMatchHistory,
  getMemberRank,
  parseIdList,
  type Appearance,
  type MemberMatchHistoryRow,
} from "@/lib/members";
import { HOLDERS, HOLDER_LABEL, infoLines, type Equipment } from "@/lib/equipment";
import { ROLE_LABEL } from "@/lib/roles";
import { cardClass } from "@/lib/ui";
import { ClassBadge } from "@/components/ClassIcon";
import { GameIcon, ResultIcon, RoleBadge } from "@/components/GameAssets";
import { EquipmentPanels } from "@/components/EquipmentPanels";

function hasAnything(equipment: Equipment, appearance: Appearance) {
  return Object.keys(equipment).length > 0 || Object.values(appearance).some(Boolean);
}

/** Stored UTC -> Vietnam time, whatever timezone the server runs in. */
function formatPlayedAt(stored: string) {
  return new Date(stored.replace(" ", "T") + "Z").toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const member = await getMemberByName(decodeURIComponent(name));
  if (!member) notFound();

  const [history, gear, rank] = await Promise.all([
    getMemberMatchHistory(member.id),
    getMemberGear(member.id),
    getMemberRank(member.elo),
  ]);
  const skillIds = parseIdList(member.skill_ids);
  const panels = HOLDERS.filter((h) => hasAnything(gear.equipment[h], gear.appearance[h]));
  const winRate = member.games_played > 0 ? Math.round((member.wins / member.games_played) * 100) : null;
  const lastChange = member.last_elo_change;

  return (
    // Desktop: fills the viewport (profile-fit), so the profile card and the
    // equipment stay put and only the match history scrolls.
    <div className="profile-fit flex flex-col gap-6 lg:flex-row">
      {panels.length > 0 && (
        // On short screens the stacked panels scroll inside their own column.
        <div className="order-2 w-full shrink-0 lg:min-h-0 lg:w-96 lg:overflow-y-auto">
          <EquipmentPanels
            panels={panels.map((holder) => ({
              key: holder,
              label: HOLDER_LABEL[holder],
              equipment: gear.equipment[holder],
              appearance: gear.appearance[holder],
              info: infoLines(
                member.character_name,
                holder === "main" ? member.level : member.pt,
                member.class,
                gear.stats[holder],
                holder,
              ),
            }))}
          />
        </div>
      )}

      {/* Desktop: this column on the left, the equipment window on the right.
          On phones this column dissolves (display: contents) so its cards can
          sit around the panel: profile first, then panel, skills, history. */}
      <div className="contents lg:order-1 lg:flex lg:min-h-0 lg:min-w-0 lg:flex-1 lg:flex-col lg:gap-4">
        {/* Profile: who they are on the left, where they stand on the right. */}
        <section className={cardClass + " order-1 p-4 lg:order-none"}>
          <div className="flex flex-wrap items-center gap-4">
            {member.avatar_id && (
              <GameIcon
                id={member.avatar_id}
                alt={member.character_name}
                className="h-16 w-16 shrink-0 rounded-md border border-border bg-surface-raised sm:h-20 sm:w-20"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                <RoleBadge iconId={member.icon} className="h-7 w-7 sm:h-8 sm:w-8" />
                <span className="truncate">{member.character_name}</span>
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                <ClassBadge className={member.class} />
                {member.icon && ROLE_LABEL[member.icon] && <span>{ROLE_LABEL[member.icon]}</span>}
                {member.owner && <span>· {member.owner}</span>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Hạng #{rank}</p>
              <p className="font-display text-4xl font-bold leading-none text-gold">{Math.round(member.elo)}</p>
              <p className="mt-1 text-xs text-muted">
                Elo
                {lastChange !== null && lastChange !== 0 && (
                  <span className={"ml-1 font-mono font-semibold " + (lastChange > 0 ? "text-green-400" : "text-red-400")}>
                    {lastChange > 0 ? "▲" : "▼"} {Math.abs(Math.round(lastChange))}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
            <Stat label="Số trận" value={member.games_played} />
            <Stat
              label="Thắng / Thua"
              value={
                <>
                  <span className="text-green-400">{member.wins}</span>
                  <span className="text-muted"> / </span>
                  <span className="text-red-400">{member.losses}</span>
                </>
              }
            />
            <Stat label="Tỉ lệ thắng" value={winRate === null ? "—" : `${winRate}%`} />
          </div>
          {winRate !== null && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-red-500/30" aria-hidden>
              <div className="h-full rounded-full bg-green-500" style={{ width: `${winRate}%` }} />
            </div>
          )}
        </section>

        {skillIds.length > 0 && (
          <section className={cardClass + " order-3 p-4 lg:order-none"}>
            <h2 className="mb-2 text-xs font-medium text-muted">Kỹ năng</h2>
            <div className="flex flex-wrap gap-2">
              {skillIds.map((id) => (
                <GameIcon key={id} id={id} className="h-10 w-10 rounded-md border border-border" />
              ))}
            </div>
          </section>
        )}

        <section className={cardClass + " order-4 overflow-hidden lg:order-none lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"}>
          <h2 className="shrink-0 border-b border-border px-4 py-3 font-display text-lg font-semibold tracking-wide">
            Lịch sử trận
          </h2>
          {history.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Chưa có trận đấu nào.</p>
          ) : (
            <ul className="divide-y divide-border lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {history.map((h) => (
                <HistoryRow key={h.match_id} row={h} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: MemberMatchHistoryRow }) {
  const outcome = row.result === "DRAW" ? "draw" : row.team === row.result ? "win" : "lose";
  return (
    <li className="flex items-center gap-3 px-4 py-2.5 text-sm">
      {/* Fixed-width result cell so the numbers line up. */}
      <span className="flex w-16 shrink-0 items-center">
        {outcome === "win" ? (
          <ResultIcon outcome="win" className="h-6" />
        ) : outcome === "lose" ? (
          <span className="font-semibold text-red-400">Thua</span>
        ) : (
          <span className="font-semibold text-muted">Hòa</span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-muted">{formatPlayedAt(row.played_at)}</span>
      <span className="hidden font-mono text-xs text-muted sm:inline">
        {Math.round(row.elo_before)} → {Math.round(row.elo_after)}
      </span>
      <span
        className={
          "w-14 text-right font-mono font-semibold " +
          (row.elo_change > 0 ? "text-green-400" : row.elo_change < 0 ? "text-red-400" : "text-muted")
        }
      >
        {row.elo_change > 0 ? "+" : ""}
        {Math.round(row.elo_change)}
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-display text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
