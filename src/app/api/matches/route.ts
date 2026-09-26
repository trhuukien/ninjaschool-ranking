import { NextResponse } from "next/server";
import { createMatch, listMatches } from "@/lib/matches";
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
  try {
    const body = (await req.json()) as CreateMatchBody;
    const outcome = await createMatch({
      teamAIds: body.teamAIds,
      teamBIds: body.teamBIds,
      result: body.result,
      note: body.note,
    });
    return NextResponse.json(outcome);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Tạo trận đấu thất bại" },
      { status: 400 },
    );
  }
}
