import { listMembers } from "@/lib/members";
import { NewMatchForm } from "./NewMatchForm";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const members = await listMembers();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
        Ghi trận đấu mới
      </h1>
      <NewMatchForm
        members={members.map((m) => ({
          id: m.id,
          character_name: m.character_name,
          owner: m.owner,
          class: m.class,
          elo: m.elo,
          games_played: m.games_played,
        }))}
      />
    </div>
  );
}
