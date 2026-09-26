import { NextResponse } from "next/server";
import { importMembersFromSheet } from "@/lib/members";

export async function POST() {
  try {
    const result = await importMembersFromSheet();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import thất bại" },
      { status: 500 },
    );
  }
}
