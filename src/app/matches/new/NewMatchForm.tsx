"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeMatchElo, type TeamResult } from "@/lib/elo";
import { cardClass, fieldClass } from "@/lib/ui";
import { ClassBadge, ClassName } from "@/components/ClassIcon";
import { PhaseIcon, ResultIcon } from "@/components/GameAssets";

type Team = "A" | "B" | null;
type Winner = "A" | "B" | null;

interface MemberOption {
  id: number;
  character_name: string;
  owner: string | null;
  class: string | null;
  elo: number;
  games_played: number;
}

const MAX_TEAM_SIZE = 6;

export function NewMatchForm({ members }: { members: MemberOption[] }) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Record<number, Team>>({});
  const [winner, setWinner] = useState<Winner>(null);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<null | {
    teamA: { characterName: string; class: string | null; eloBefore: number; eloAfter: number; eloChange: number }[];
    teamB: { characterName: string; class: string | null; eloBefore: number; eloAfter: number; eloChange: number }[];
  }>(null);

  const teamAIds = useMemo(
    () => Object.entries(assignments).filter(([, t]) => t === "A").map(([id]) => Number(id)),
    [assignments],
  );
  const teamBIds = useMemo(
    () => Object.entries(assignments).filter(([, t]) => t === "B").map(([id]) => Number(id)),
    [assignments],
  );

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const preview = useMemo(() => {
    if (!winner) return null;
    if (teamAIds.length === 0 || teamBIds.length === 0) return null;
    if (teamAIds.length > MAX_TEAM_SIZE || teamBIds.length > MAX_TEAM_SIZE) return null;
    try {
      return computeMatchElo(
        teamAIds.map((id) => ({ id, elo: byId.get(id)!.elo, gamesPlayed: byId.get(id)!.games_played })),
        teamBIds.map((id) => ({ id, elo: byId.get(id)!.elo, gamesPlayed: byId.get(id)!.games_played })),
        winner,
      );
    } catch {
      return null;
    }
  }, [teamAIds, teamBIds, byId, winner]);

  const setTeam = (id: number, team: Team) => {
    setAssignments((prev) => ({ ...prev, [id]: team }));
  };

  const filtered = members.filter((m) =>
    m.character_name.toLowerCase().includes(query.toLowerCase()),
  );

  const canSubmit =
    teamAIds.length > 0 &&
    teamAIds.length <= MAX_TEAM_SIZE &&
    teamBIds.length > 0 &&
    teamBIds.length <= MAX_TEAM_SIZE &&
    winner !== null &&
    !submitting;

  const handleSubmit = async () => {
    if (!winner) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamAIds, teamBIds, result: winner as TeamResult, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tạo trận đấu thất bại");
      setSubmitted(data);
      setAssignments({});
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tạo trận đấu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <p className="mb-3 font-display font-semibold tracking-wide text-green-400">
            Đã lưu trận đấu!
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ResultTeam phase="A" align="left" won={winner === "A"} players={submitted.teamA} />
            <ResultTeam phase="B" align="right" won={winner === "B"} players={submitted.teamB} />
          </div>
        </div>
        <button
          onClick={() => {
            setSubmitted(null);
            setWinner(null);
          }}
          className="self-start rounded-md border border-border bg-surface px-3 py-1.5 text-sm hover:bg-surface-raised"
        >
          Ghi trận đấu khác
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_400px] md:items-start">
      {/* Chọn phe thắng + ghi chú — hiện trước trên mobile để khỏi cuộn qua cả roster mới bấm lưu được */}
      <div className="order-1 flex flex-col gap-4 md:sticky md:top-20 md:order-2">
        <div className="grid grid-cols-2 gap-2">
          <PhaseColumn
            phase="A"
            align="left"
            ids={teamAIds}
            byId={byId}
            preview={preview?.teamA}
            overLimit={teamAIds.length > MAX_TEAM_SIZE}
            selected={winner === "A"}
            onSelect={() => setWinner("A")}
          />
          <PhaseColumn
            phase="B"
            align="right"
            ids={teamBIds}
            byId={byId}
            preview={preview?.teamB}
            overLimit={teamBIds.length > MAX_TEAM_SIZE}
            selected={winner === "B"}
            onSelect={() => setWinner("B")}
          />
        </div>
        <p className="text-center text-xs text-muted">Bấm vào phe thắng ở trên</p>

        <div className={cardClass + " flex flex-col gap-3 p-4"}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted">Ghi chú (tùy chọn)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 hover:bg-accent-strong disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? "Đang lưu..." : "Lưu trận đấu"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </div>

      {/* Roster picker */}
      <div className="order-2 flex flex-col gap-3 md:order-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nhân vật..."
          className={fieldClass}
        />

        <div className={"overflow-hidden " + cardClass}>
          <div className="max-h-[32rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-surface-raised text-left text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Nhân vật</th>
                  <th className="px-3 py-2 font-medium">Elo</th>
                  <th className="px-3 py-2 font-medium">Phe</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const team = assignments[m.id] ?? null;
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ClassBadge className={m.class} />
                          <span className="font-medium">{m.character_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono">{Math.round(m.elo)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <TeamButton active={team === "A"} onClick={() => setTeam(m.id, team === "A" ? null : "A")}>
                            <PhaseIcon phase="A" className="h-4 w-4" />
                          </TeamButton>
                          <TeamButton active={team === "B"} onClick={() => setTeam(m.id, team === "B" ? null : "B")}>
                            <PhaseIcon phase="B" className="h-4 w-4" />
                          </TeamButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors " +
        (active
          ? "bg-accent"
          : "border border-border opacity-60 hover:border-accent hover:opacity-100")
      }
    >
      {children}
    </button>
  );
}

function PhaseColumn({
  phase,
  align,
  ids,
  byId,
  preview,
  overLimit,
  selected,
  onSelect,
}: {
  phase: "A" | "B";
  align: "left" | "right";
  ids: number[];
  byId: Map<number, MemberOption>;
  preview?: { id: number; eloChange: number }[];
  overLimit: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const reverse = align === "right";
  const avg = ids.length
    ? Math.round(ids.reduce((s, id) => s + byId.get(id)!.elo, 0) / ids.length)
    : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors " +
        (selected
          ? "border-accent bg-accent/10 shadow-sm shadow-accent/20"
          : "border-border bg-surface hover:border-accent/40")
      }
    >
      <div className={"flex items-center justify-between gap-2" + (reverse ? " flex-row-reverse" : "")}>
        <PhaseIcon phase={phase} className="h-7" />
        {selected && <ResultIcon outcome="win" className="h-5" />}
      </div>
      <div className={"flex items-center justify-between text-xs text-muted" + (reverse ? " flex-row-reverse" : "")}>
        <span>
          {ids.length}/{MAX_TEAM_SIZE}
        </span>
        {avg !== null && <span>Elo Team: {avg}</span>}
      </div>
      {overLimit && (
        <p className={"text-xs text-red-400" + (reverse ? " text-right" : "")}>
          Mỗi phe tối đa {MAX_TEAM_SIZE} thành viên.
        </p>
      )}
      {ids.length === 0 ? (
        <p className={"text-xs text-muted" + (reverse ? " text-right" : "")}>Chưa chọn thành viên nào.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 text-sm">
          {ids.map((id) => {
            const change = preview?.find((p) => p.id === id)?.eloChange;
            return (
              <li
                key={id}
                className={"flex items-center justify-between gap-2" + (reverse ? " flex-row-reverse" : "")}
              >
                <ClassName characterClass={byId.get(id)!.class} align={align}>
                  {byId.get(id)!.character_name}
                </ClassName>
                {change !== undefined && (
                  <span
                    className={
                      "shrink-0 font-mono text-xs " +
                      (change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-muted")
                    }
                  >
                    {change > 0 ? "+" : ""}
                    {change}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </button>
  );
}

function ResultTeam({
  phase,
  align,
  won,
  players,
}: {
  phase: "A" | "B";
  align: "left" | "right";
  won: boolean;
  players: { characterName: string; class: string | null; eloBefore: number; eloAfter: number; eloChange: number }[];
}) {
  const reverse = align === "right";
  return (
    <div>
      <div className={"mb-1 flex items-center gap-2" + (reverse ? " flex-row-reverse" : "")}>
        <PhaseIcon phase={phase} className="h-6" />
        {won && <ResultIcon outcome="win" className="h-5" />}
      </div>
      <ul className="flex flex-col gap-0.5 text-sm">
        {players.map((p) => (
          <li
            key={p.characterName}
            className={"flex items-center justify-between gap-2" + (reverse ? " flex-row-reverse" : "")}
          >
            <ClassName characterClass={p.class} align={align}>
              {p.characterName}
            </ClassName>
            <span className="shrink-0 font-mono text-xs">
              {Math.round(p.eloBefore)} → {Math.round(p.eloAfter)} (
              {p.eloChange > 0 ? "+" : ""}
              {p.eloChange})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
