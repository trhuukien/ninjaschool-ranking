import Link from "next/link";
import { notFound } from "next/navigation";
import { getMember, getMemberMatchHistory, parseIdList } from "@/lib/members";
import { cardClass } from "@/lib/ui";
import { ClassBadge } from "@/components/ClassIcon";
import { GameIcon, ResultIcon, RoleBadge, type Outcome } from "@/components/GameAssets";

export const dynamic = "force-dynamic";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const memberId = Number(id);
  const member = await getMember(memberId);
  if (!member) notFound();

  const history = await getMemberMatchHistory(memberId);
  const skillIds = parseIdList(member.skill_ids);
  const itemIds = parseIdList(member.item_ids);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        {member.avatar_id && (
          <GameIcon
            id={member.avatar_id}
            alt={member.character_name}
            className="h-20 w-20 shrink-0 rounded-md border border-border sm:h-24 sm:w-24"
          />
        )}
        <div className="min-w-0">
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            ← Bảng xếp hạng
          </Link>
          <h1 className="mt-1 flex items-center gap-2 font-display text-2xl font-bold tracking-wide sm:text-3xl">
            <RoleBadge iconId={member.icon} className="h-8 w-8 sm:h-9 sm:w-9" />
            {member.character_name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <ClassBadge className={member.class} />
            <span>Cấp độ: {member.level || "—"}</span>
            <span>· PT: {member.pt || "—"}</span>
          </div>
        </div>
      </div>

      {(skillIds.length > 0 || itemIds.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {skillIds.length > 0 && (
            <div className={cardClass + " p-3"}>
              <p className="mb-2 text-xs font-medium text-muted">Kỹ năng</p>
              <div className="flex flex-wrap gap-2">
                {skillIds.map((id) => (
                  <GameIcon key={id} id={id} className="h-10 w-10 rounded-md border border-border" />
                ))}
              </div>
            </div>
          )}
          {itemIds.length > 0 && (
            <div className={cardClass + " p-3"}>
              <p className="mb-2 text-xs font-medium text-muted">Trang bị</p>
              <div className="flex flex-wrap gap-2">
                {itemIds.map((id) => (
                  <GameIcon key={id} id={id} className="h-10 w-10 rounded-md border border-border" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Elo hiện tại" value={Math.round(member.elo).toString()} />
        <Stat label="Số trận" value={member.games_played.toString()} />
        <Stat label="Thắng / Thua" value={`${member.wins} / ${member.losses}`} />
        <Stat
          label="Tỉ lệ thắng"
          value={
            member.games_played > 0
              ? `${Math.round((member.wins / member.games_played) * 100)}%`
              : "—"
          }
        />
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg font-semibold tracking-wide">
          Lịch sử trận
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted">Chưa có trận đấu nào.</p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="flex flex-col gap-2 sm:hidden">
              {history.map((h) => (
                <HistoryCard key={h.match_id} row={h} />
              ))}
            </div>

            {/* Desktop: table */}
            <div className={"hidden overflow-x-auto sm:block " + cardClass}>
              <table className="w-full text-sm">
                <thead className="bg-surface-raised text-left text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Ngày</th>
                    <th className="px-3 py-2 font-medium">Phe</th>
                    <th className="px-3 py-2 font-medium">Kết quả</th>
                    <th className="px-3 py-2 text-right font-medium">Elo trước → sau</th>
                    <th className="px-3 py-2 text-right font-medium">Thay đổi</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => {
                    const outcome = matchOutcome(h.team, h.result);
                    return (
                      <tr key={h.match_id} className="border-t border-border">
                        <td className="px-3 py-2 text-muted">
                          {new Date(h.played_at + "Z").toLocaleString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 text-muted">{h.team === "A" ? "Phe 1" : "Phe 2"}</td>
                        <td className="px-3 py-2">
                          <ResultIcon outcome={outcome} className="h-6" />
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {Math.round(h.elo_before)} → {Math.round(h.elo_after)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold">
                          {h.elo_change > 0 ? "+" : ""}
                          {h.elo_change}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function matchOutcome(team: "A" | "B", result: "A" | "B" | "DRAW"): Outcome {
  if (result === "DRAW") return "draw";
  return team === result ? "win" : "lose";
}

function HistoryCard({
  row,
}: {
  row: Awaited<ReturnType<typeof getMemberMatchHistory>>[number];
}) {
  const outcome = matchOutcome(row.team, row.result);
  return (
    <div className={cardClass + " p-3"}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted">{row.team === "A" ? "Phe 1" : "Phe 2"}</span>
        <ResultIcon outcome={outcome} className="h-6" />
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm">
          {Math.round(row.elo_before)} → {Math.round(row.elo_after)}
        </span>
        <span className="font-mono text-sm font-semibold">
          {row.elo_change > 0 ? "+" : ""}
          {row.elo_change}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        {new Date(row.played_at + "Z").toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass + " p-3"}>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-display text-xl font-bold">{value}</p>
    </div>
  );
}
