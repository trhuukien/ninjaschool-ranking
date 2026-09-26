import Link from "next/link";
import { listMembers, type Member } from "@/lib/members";
import { ClassName } from "@/components/ClassIcon";
import { GameIcon, RoleBadge } from "@/components/GameAssets";

export const dynamic = "force-dynamic";

const RANK_STYLE: Record<number, string> = {
  1: "text-gold",
  2: "text-zinc-300",
  3: "text-amber-600",
};

export default async function Home() {
  const members = await listMembers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-foreground sm:text-3xl">
          Bảng xếp hạng
        </h1>
        <p className="text-sm text-muted">
          {members.length} nhẫn giả.
        </p>
      </div>

      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted">
          Chưa có thành viên nào. Bấm &quot;Đồng bộ từ Google Sheet&quot; để nhập danh sách từ
          Google Sheet.
        </p>
      ) : (
        <>
          {/* Mobile: rank cards */}
          <div className="flex flex-col gap-2 sm:hidden">
            {members.map((m, i) => (
              <MemberCard key={m.id} member={m} rank={i + 1} />
            ))}
          </div>

          {/* Desktop: table — capped height + internal scroll so a big roster
              doesn't force the whole page to scroll past the header/controls */}
          <div className="hidden overflow-hidden rounded-lg border border-border bg-surface sm:block">
            <div className="max-h-[70vh] overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-raised text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Nhân vật</th>
                  <th className="px-4 py-3 font-medium">Class</th>
                  <th className="px-4 py-3 font-medium">Cấp độ</th>
                  <th className="px-4 py-3 text-right font-medium">Elo</th>
                  <th className="px-4 py-3 text-right font-medium">Thắng</th>
                  <th className="px-4 py-3 text-right font-medium">Thua</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => (
                  <tr key={m.id} className="border-t border-border text-base">
                    <td className={"px-4 py-4 font-display text-lg font-bold " + (RANK_STYLE[i + 1] ?? "text-muted")}>
                      {i + 1}
                    </td>
                    <td className="px-4 py-4 font-medium">
                      <Link
                        href={`/members/${encodeURIComponent(m.character_name)}`}
                        className="flex items-center gap-2 hover:text-accent-strong hover:underline"
                      >
                        {m.avatar_id ? (
                          <GameIcon id={m.avatar_id} alt="" className="mr-1 h-10 w-10 shrink-0" />
                        ) : (
                          <span className="mr-1 h-10 w-10 shrink-0 bg-surface-raised" />
                        )}
                        <span className="inline-flex items-center gap-1.5">
                          <RoleBadge iconId={m.icon} />
                          {m.character_name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <ClassName characterClass={m.class}>{m.class || "—"}</ClassName>
                    </td>
                    <td className="px-4 py-4 text-muted">{m.level}</td>
                    <td className="px-4 py-4 text-right font-mono">
                      <span className="inline-flex items-center gap-1.5">
                        {Math.round(m.elo)}
                        <EloTrend change={m.last_elo_change} />
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-green-400">{m.wins}</td>
                    <td className="px-4 py-4 text-right font-mono text-red-400">{m.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Small up/down indicator from the member's most recent match result. */
function EloTrend({ change }: { change: number | null }) {
  if (change === null || change === 0) return null;
  return change > 0 ? (
    <span className="text-[8px] leading-none text-green-400" title={`Trận gần nhất: +${change}`}>
      ▲
    </span>
  ) : (
    <span className="text-[8px] leading-none text-red-400" title={`Trận gần nhất: ${change}`}>
      ▼
    </span>
  );
}

function MemberCard({ member, rank }: { member: Member; rank: number }) {
  return (
    <Link
      href={`/members/${encodeURIComponent(member.character_name)}`}
      className="flex items-center gap-3 rounded-lg border border-border p-4 active:bg-surface-raised"
    >
      <span className={"w-7 shrink-0 text-center font-display text-xl font-bold " + (RANK_STYLE[rank] ?? "text-muted")}>
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-base font-medium">
          <RoleBadge iconId={member.icon} />
          {member.character_name}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <ClassName characterClass={member.class}>{member.class || "—"}</ClassName>
          <span className="text-xs text-muted">· Cấp {member.level || "—"}</span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="inline-flex items-center gap-1.5 font-mono text-base">
          {Math.round(member.elo)}
          <EloTrend change={member.last_elo_change} />
        </p>
        <p className="font-mono text-xs text-muted">
          <span className="text-green-400">{member.wins}T</span>{" "}
          <span className="text-red-400">{member.losses}B</span>
        </p>
      </div>
    </Link>
  );
}
