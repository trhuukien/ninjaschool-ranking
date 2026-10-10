"use client";

import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MemberCard } from "@/lib/members";
import { cardClass } from "@/lib/ui";
import { ClassName } from "@/components/ClassIcon";
import { GameIcon, PhaseIcon, VsIcon } from "@/components/GameAssets";
import { CharacterFigure } from "@/components/EquipmentPanel";

type Side = "A" | "B";
const SIDE_LABEL: Record<Side, string> = { A: "Bạch", B: "Hắc" };
const MAX_TEAM = 6;

// Reel geometry and timing (CS2-style case opening).
const CARD_W = 104;
const CARD_GAP = 8;
const STEP = CARD_W + CARD_GAP;
const REEL_LENGTH = 60;
const WIN_INDEX = 52;
const SPIN_MS = 5200;

/** Unbiased random integer in [0, n). */
function randInt(n: number): number {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function avgElo(ids: number[], byId: Map<number, MemberCard>) {
  return ids.length ? ids.reduce((s, id) => s + byId.get(id)!.elo, 0) / ids.length : 0;
}

interface Reel {
  items: number[];
  /** Final translateX of the strip, applied after the first paint so it animates. */
  target: number;
  started: boolean;
  winner: number;
  side: Side;
}

export function TeamRandomizer({ members, isAdmin }: { members: MemberCard[]; isAdmin: boolean }) {
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const [pool, setPool] = useState<Set<number>>(() => new Set(members.map((m) => m.id)));
  const [teams, setTeams] = useState<Record<Side, number[]>>({ A: [], B: [] });
  const [side, setSide] = useState<Side>("A");
  const [reel, setReel] = useState<Reel | null>(null);
  const [lastWinner, setLastWinner] = useState<number | null>(null);
  const [stage, setStage] = useState<"draft" | "battle">("draft");
  const reelBox = useRef<HTMLDivElement>(null);

  const assigned = useMemo(() => new Set([...teams.A, ...teams.B]), [teams]);
  const candidates = members.filter((m) => pool.has(m.id) && !assigned.has(m.id)).map((m) => m.id);
  // A spin runs from setting a reel until its winner has been placed.
  const spinning = reel !== null && lastWinner !== reel.winner;
  const sideFull = (s: Side) => teams[s].length >= MAX_TEAM;

  const assign = (id: number, s: Side) => {
    if (sideFull(s)) return;
    setTeams((t) => ({ A: t.A.filter((x) => x !== id).concat(s === "A" ? [id] : []), B: t.B.filter((x) => x !== id).concat(s === "B" ? [id] : []) }));
  };
  const unassign = (id: number) => setTeams((t) => ({ A: t.A.filter((x) => x !== id), B: t.B.filter((x) => x !== id) }));
  const togglePool = (id: number) =>
    setPool((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const spin = () => {
    if (spinning || candidates.length === 0 || sideFull(side) || !reelBox.current) return;
    const winner = candidates[randInt(candidates.length)];
    const items = Array.from({ length: REEL_LENGTH }, () => candidates[randInt(candidates.length)]);
    items[WIN_INDEX] = winner;
    // Land somewhere inside the winning card, not always dead centre.
    const jitter = (randInt(1000) / 1000 - 0.5) * CARD_W * 0.7;
    const center = reelBox.current.clientWidth / 2;
    const target = -(WIN_INDEX * STEP + CARD_W / 2 + jitter - center);
    setLastWinner(null);
    setReel({ items, target, started: false, winner, side });
  };

  // Start the slide one frame after the strip is laid out at 0, so the
  // transform transition actually runs.
  useLayoutEffect(() => {
    if (!reel || reel.started) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReel((r) => (r ? { ...r, started: true } : r))));
    return () => cancelAnimationFrame(id);
  }, [reel]);

  const onReelStop = () => {
    if (!reel || lastWinner === reel.winner) return;
    setLastWinner(reel.winner);
    assign(reel.winner, reel.side);
  };

  /** Deal everyone left into the two sides, evening out the headcount. */
  const quickSplit = () => {
    if (spinning) return;
    const next = { A: [...teams.A], B: [...teams.B] };
    for (const id of shuffle(candidates)) {
      const s: Side = next.A.length <= next.B.length ? "A" : "B";
      const other: Side = s === "A" ? "B" : "A";
      if (next[s].length < MAX_TEAM) next[s].push(id);
      else if (next[other].length < MAX_TEAM) next[other].push(id);
    }
    setTeams(next);
  };

  const reset = () => {
    setTeams({ A: [], B: [] });
    setReel(null);
    setLastWinner(null);
    setStage("draft");
  };

  if (stage === "battle") {
    return <Battle teams={teams} byId={byId} isAdmin={isAdmin} onBack={() => setStage("draft")} onReset={reset} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The two sides; clicking one picks where the next spin goes. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((s) => (
          <section
            key={s}
            onClick={() => setSide(s)}
            className={
              cardClass +
              " cursor-pointer p-3 transition-shadow " +
              (side === s ? "ring-2 ring-gold" : "hover:ring-1 hover:ring-border")
            }
          >
            <div className="mb-2 flex items-center gap-2">
              <PhaseIcon phase={s} className="h-6" />
              <span className="font-display text-lg font-semibold">Phe {SIDE_LABEL[s]}</span>
              <span className="text-xs text-muted">
                {teams[s].length}/{MAX_TEAM}
                {teams[s].length > 0 && ` · Elo TB ${Math.round(avgElo(teams[s], byId))}`}
              </span>
              {side === s && <span className="ml-auto text-xs font-semibold text-gold">Đang chọn</span>}
            </div>
            {teams[s].length === 0 ? (
              <p className="text-xs text-muted">Chưa có ai.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {teams[s].map((id) => (
                  <span
                    key={id}
                    className={
                      "flex items-center gap-1 rounded-md border border-border bg-surface-raised py-0.5 pl-1 pr-1.5 text-sm" +
                      (id === lastWinner ? " reel-win" : "")
                    }
                  >
                    <Avatar member={byId.get(id)!} className="h-6 w-6" />
                    {byId.get(id)!.character_name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unassign(id);
                      }}
                      className="ml-0.5 text-muted hover:text-foreground"
                      aria-label={`Bỏ ${byId.get(id)!.character_name} khỏi phe`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* The reel. */}
      <section className={cardClass + " p-3"}>
        <div ref={reelBox} className="relative h-36 overflow-hidden rounded-md bg-background">
          <div
            className="absolute left-0 top-3 flex"
            style={{
              gap: CARD_GAP,
              transform: `translateX(${reel?.started ? reel.target : 0}px)`,
              transition: reel?.started ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.6, 0.1, 1)` : "none",
            }}
            onTransitionEnd={onReelStop}
          >
            {(reel?.items ?? candidates.slice(0, 12)).map((id, i) => {
              const m = byId.get(id)!;
              const won = reel !== null && lastWinner === reel.winner && i === WIN_INDEX;
              return (
                <div
                  key={i}
                  className={
                    "flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface-raised py-2" +
                    (won ? " reel-win" : "")
                  }
                  style={{ width: CARD_W, height: 112 }}
                >
                  <Avatar member={m} className="h-12 w-12" />
                  <span className="w-full truncate px-1 text-center text-xs font-medium">{m.character_name}</span>
                  <span className="text-[10px]">
                    <ClassName characterClass={m.class}>{m.class || "—"}</ClassName>
                  </span>
                </div>
              );
            })}
          </div>
          {/* Centre marker. */}
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-gold shadow-[0_0_8px_var(--gold)]" />
          <div className="pointer-events-none absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[9px] border-x-transparent border-t-gold" />
          <div className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[9px] border-x-transparent border-b-gold" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={spin}
            disabled={spinning || candidates.length === 0 || sideFull(side)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/30 hover:bg-accent-strong disabled:opacity-50"
          >
            {spinning ? "Đang quay..." : `Quay vào phe ${SIDE_LABEL[side]}`}
          </button>
          <button
            type="button"
            onClick={quickSplit}
            disabled={spinning || candidates.length === 0}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground hover:bg-surface-raised disabled:opacity-50"
          >
            Chia nhanh phần còn lại
          </button>
          <span className="text-xs text-muted">Còn {candidates.length} người trong danh sách quay</span>
          <button
            type="button"
            onClick={() => setStage("battle")}
            disabled={spinning || teams.A.length === 0 || teams.B.length === 0}
            className="ml-auto rounded-md bg-gold px-4 py-2 text-sm font-bold text-black hover:brightness-110 disabled:opacity-40"
          >
            Đấu!
          </button>
        </div>
        {lastWinner !== null && reel && (
          <p className="mt-2 text-sm">
            <span className="font-semibold text-gold">{byId.get(lastWinner)!.character_name}</span> vào phe{" "}
            {SIDE_LABEL[reel.side]}!
          </p>
        )}
      </section>

      {/* Who's in the draw; pre-assign straight to a side. */}
      <section className={cardClass + " p-3"}>
        <div className="mb-2 flex items-center gap-3">
          <h2 className="font-display text-lg font-semibold">Danh sách quay</h2>
          <button
            type="button"
            onClick={() => setPool(new Set(members.map((m) => m.id)))}
            className="text-xs text-muted hover:text-foreground"
          >
            Chọn tất cả
          </button>
          <button type="button" onClick={() => setPool(new Set())} className="text-xs text-muted hover:text-foreground">
            Bỏ chọn
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => {
            const inTeam = teams.A.includes(m.id) ? "A" : teams.B.includes(m.id) ? "B" : null;
            return (
              <div
                key={m.id}
                className={
                  "flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm " +
                  (inTeam ? "opacity-50" : pool.has(m.id) ? "bg-surface-raised" : "opacity-60")
                }
              >
                <input
                  type="checkbox"
                  checked={pool.has(m.id)}
                  disabled={inTeam !== null}
                  onChange={() => togglePool(m.id)}
                  aria-label={`Cho ${m.character_name} vào danh sách quay`}
                />
                <Avatar member={m} className="h-7 w-7" />
                <span className="min-w-0 flex-1 truncate">{m.character_name}</span>
                {inTeam ? (
                  <span className="text-xs text-muted">Phe {SIDE_LABEL[inTeam]}</span>
                ) : (
                  (["A", "B"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={spinning || sideFull(s)}
                      onClick={() => assign(m.id, s)}
                      title={`Xếp vào phe ${SIDE_LABEL[s]}`}
                      className="rounded border border-border p-0.5 hover:bg-surface disabled:opacity-40"
                    >
                      <PhaseIcon phase={s} className="h-4" />
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Avatar({ member, className }: { member: MemberCard; className: string }) {
  return member.avatar_id ? (
    <GameIcon id={member.avatar_id} alt="" className={className + " shrink-0"} />
  ) : (
    <span className={className + " shrink-0 rounded bg-surface"} />
  );
}

function Battle({
  teams,
  byId,
  isAdmin,
  onBack,
  onReset,
}: {
  teams: Record<Side, number[]>;
  byId: Map<number, MemberCard>;
  isAdmin: boolean;
  onBack: () => void;
  onReset: () => void;
}) {
  const eloA = avgElo(teams.A, byId);
  const eloB = avgElo(teams.B, byId);
  // Standard Elo expectation, the same formula the ranking uses.
  const chanceA = Math.round(100 / (1 + 10 ** ((eloB - eloA) / 400)));

  const side = (s: Side) => (
    <div className="flex flex-1 flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <PhaseIcon phase={s} className="h-7" />
        <span className="font-display text-xl font-bold">Phe {SIDE_LABEL[s]}</span>
      </div>
      <p className="text-xs text-muted">
        Elo TB {Math.round(s === "A" ? eloA : eloB)} · {s === "A" ? chanceA : 100 - chanceA}% thắng
      </p>
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-4">
        {teams[s].map((id, i) => {
          const m = byId.get(id)!;
          const hasLook = Object.values(m.appearance).some(Boolean);
          return (
            <div
              key={id}
              className={"flex w-24 flex-col items-center " + (s === "A" ? "vs-enter-left" : "vs-enter-right")}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* Bạch faces right, Hắc faces left: they look at each other. */}
              {hasLook ? (
                <CharacterFigure appearance={m.appearance} scale={0.55} mirrored={s === "B"} />
              ) : (
                <div className="flex h-24 items-end">
                  <Avatar member={m} className="h-16 w-16" />
                </div>
              )}
              <span className="mt-1 w-full truncate text-center text-sm font-semibold">{m.character_name}</span>
              <span className="text-[11px]">
                <ClassName characterClass={m.class}>{m.class || "—"}</ClassName>
                <span className="text-muted"> · {Math.round(m.elo)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const matchHref = `/matches/new?a=${teams.A.join(",")}&b=${teams.B.join(",")}`;
  return (
    <div className="flex flex-col gap-4">
      <section
        className="relative overflow-hidden rounded-lg border-2 border-[#4a1208] p-4 sm:p-6"
        style={{ background: "radial-gradient(ellipse at center, #7a2a00 0%, #3a1000 70%, #1d0800 100%)" }}
      >
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {side("A")}
          <div className="flex flex-col items-center gap-1 self-center">
            <VsIcon className="vs-pulse h-14 sm:h-16" />
            <span className="font-display text-3xl font-black tracking-widest text-gold drop-shadow">VS</span>
          </div>
          {side("B")}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised"
        >
          ← Chỉnh lại phe
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm hover:bg-surface-raised"
        >
          Làm lại từ đầu
        </button>
        {isAdmin && (
          <Link
            href={matchHref}
            className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Ghi trận này
          </Link>
        )}
      </div>
    </div>
  );
}
