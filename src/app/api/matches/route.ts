import { NextResponse } from "next/server";
import { createMatch, listMatches } from "@/lib/matches";
import { getCurrentAdmin } from "@/lib/auth/session";
import type { TeamResult } from "@/lib/elo";

export async function GET() {
  return NextResponse.json(await listMatches());
}

interface CreateMatchBody {
  teamAIds: number[];
  teamBIds: number[];
  result: TeamResult;
  note?: string;
}

export async function POST(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Cần đăng nhập admin để ghi trận" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as CreateMatchBody;
    if (!["A", "B", "DRAW"].includes(body.result)) throw new Error("Kết quả không hợp lệ");
    const outcome = await createMatch({
      teamAIds: (body.teamAIds ?? []).map(Number),
      teamBIds: (body.teamBIds ?? []).map(Number),
      result: body.result,
      note: body.note?.trim() || undefined,
      createdBy: admin.id,
    });
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tạo trận đấu thất bại" },
      { status: 400 },
    );
  }
}
