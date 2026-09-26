import { NextResponse } from "next/server";
import { listMembers } from "@/lib/members";

export async function GET() {
  return NextResponse.json(await listMembers());
}
