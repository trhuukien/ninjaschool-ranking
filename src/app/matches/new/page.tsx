import { listMembers } from "@/lib/members";
import { requireAdmin } from "@/lib/auth/session";
import { NewMatchForm } from "./NewMatchForm";

export const dynamic = "force-dynamic";

/** "3,7,12" -> [3, 7, 12] */
function ids(raw: string | string[] | undefined): number[] {
  return (typeof raw === "string" ? raw.split(",") : []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const members = await listMembers();
  // ?a=1,2&b=3,4 pre-fills the two sides (from /random).
  const sp = await searchParams;
  const known = new Set(members.map((m) => m.id));
  const initialAssignments: Record<number, "A" | "B"> = {};
  for (const id of ids(sp.a)) if (known.has(id)) initialAssignments[id] = "A";
  for (const id of ids(sp.b)) if (known.has(id) && !initialAssignments[id]) initialAssignments[id] = "B";
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
        Ghi trận đấu mới
      </h1>
      <NewMatchForm
        initialAssignments={initialAssignments}
        members={members.map((m) => ({
          id: m.id,
          character_name: m.character_name,
          owner: m.owner,
          class: m.class,
          level: m.level,
          elo: m.elo,
          games_played: m.games_played,
        }))}
      />
    </div>
  );
}
