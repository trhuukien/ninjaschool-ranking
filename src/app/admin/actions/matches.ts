"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { deleteMatch, updateMatch } from "@/lib/matches";
import type { TeamResult } from "@/lib/elo";
import { FormError, handleForm, text, textOrNull, utcToVnInput, vnInputToUtc, type FormState } from "./form";

const STORED_TIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export async function updateMatchAction(matchId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    const result = text(fd, "result") as TeamResult;
    if (!["A", "B", "DRAW"].includes(result)) throw new FormError("Kết quả không hợp lệ");
    // The time input only goes down to minutes. If the admin left it alone,
    // keep the stored time with its seconds — rounding it would reorder
    // matches played within the same minute and change everyone's Elo.
    const input = text(fd, "played_at");
    const original = text(fd, "played_at_original");
    const playedAt =
      STORED_TIME_RE.test(original) && utcToVnInput(original) === input ? original : vnInputToUtc(input);
    await updateMatch(matchId, { result, note: textOrNull(fd, "note"), playedAt });
    revalidatePath("/", "layout");
    return { message: "Đã lưu, Elo đã được tính lại" };
  });
}

export async function deleteMatchAction(matchId: number): Promise<FormState> {
  await requireAdmin();
  await deleteMatch(matchId);
  revalidatePath("/", "layout");
  return { message: "Đã xoá trận, Elo đã được tính lại" };
}
