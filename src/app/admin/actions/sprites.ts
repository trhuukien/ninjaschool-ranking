"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { SPRITE_KINDS, createSprite, deleteSprite, updateSprite, type SpriteInput, type SpriteKind } from "@/lib/sprites";
import { FormError, handleForm, idList, intRequired, text, type FormState } from "./form";

function readSprite(fd: FormData): SpriteInput {
  const kind = text(fd, "kind") as SpriteKind;
  if (!SPRITE_KINDS.includes(kind)) throw new FormError("Loại sprite không hợp lệ");
  const name = text(fd, "name");
  if (!name) throw new FormError("Nhập tên sprite");
  const frames = idList(text(fd, "frames"), "Khung hình");
  if (frames.length === 0) throw new FormError("Cần ít nhất 1 ID khung hình");
  return {
    kind,
    name,
    frames,
    offsetX: intRequired(fd, "offset_x", "Lệch X", -500, 500),
    offsetY: intRequired(fd, "offset_y", "Lệch Y", -500, 500),
  };
}

export async function createSpriteAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    await createSprite(readSprite(fd));
    revalidatePath("/", "layout");
    return { message: "Đã thêm sprite" };
  });
}

export async function updateSpriteAction(spriteId: number, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  return handleForm(async () => {
    await updateSprite(spriteId, readSprite(fd));
    revalidatePath("/", "layout");
    return { message: "Đã lưu" };
  });
}

export async function deleteSpriteAction(spriteId: number): Promise<FormState> {
  await requireAdmin();
  await deleteSprite(spriteId);
  revalidatePath("/", "layout");
  return { message: "Đã xoá sprite" };
}
