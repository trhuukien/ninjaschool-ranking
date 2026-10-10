import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { listMatches } from "@/lib/matches";
import { cardClass } from "@/lib/ui";
import { deleteMatchAction, updateMatchAction } from "../../actions/matches";
import { utcToVnInput } from "../../actions/form";
import { ActionForm } from "../../ActionForm";
import { Field, PageTitle, Select, TextInput } from "../../fields";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  await requireAdmin();
  const matches = await listMatches(500);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <PageTitle>Trận đấu</PageTitle>
        <Link
          href="/matches/new"
          className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Ghi trận mới
        </Link>
      </div>
      <p className="text-sm text-muted">
        Sửa kết quả, giờ đấu hoặc xoá trận: Elo và thắng/thua của mọi người được tính lại từ đầu theo lịch sử. Giờ
        theo giờ Việt Nam.
      </p>

      {matches.length === 0 ? (
        <p className="text-sm text-muted">Chưa có trận nào.</p>
      ) : (
        matches.map((m) => (
          <div key={m.id} className={cardClass + " flex flex-col gap-3 p-4"}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <span className="font-mono text-xs text-muted">#{m.id}</span>
              <span>
                <span className="text-muted">Phe 1:</span> {m.teamA.map((p) => p.character_name).join(", ")}
              </span>
              <span>
                <span className="text-muted">Phe 2:</span> {m.teamB.map((p) => p.character_name).join(", ")}
              </span>
            </div>
            <ActionForm
              action={updateMatchAction.bind(null, m.id)}
              submitLabel="Lưu"
              className="flex flex-wrap items-end gap-3"
            >
              <Field label="Kết quả">
                <Select name="result" defaultValue={m.result}>
                  <option value="A">Phe 1 thắng</option>
                  <option value="B">Phe 2 thắng</option>
                  <option value="DRAW">Hoà</option>
                </Select>
              </Field>
              <Field label="Giờ đấu">
                <TextInput name="played_at" type="datetime-local" defaultValue={utcToVnInput(m.played_at)} required />
                <input type="hidden" name="played_at_original" value={m.played_at} />
              </Field>
              <Field label="Ghi chú" className="min-w-0 flex-1">
                <TextInput name="note" defaultValue={m.note ?? ""} maxLength={200} />
              </Field>
            </ActionForm>
            <ActionForm
              action={deleteMatchAction.bind(null, m.id)}
              submitLabel="Xoá trận"
              pendingLabel="Đang xoá..."
              confirm={`Xoá trận #${m.id}? Elo sẽ được tính lại.`}
              danger
            />
          </div>
        ))
      )}
    </div>
  );
}
