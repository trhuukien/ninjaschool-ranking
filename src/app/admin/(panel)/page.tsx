import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { cardClass } from "@/lib/ui";
import { PageTitle } from "../fields";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const db = await getDb();
  const [members, matches, sprites] = await db.batch([
    db.prepare("SELECT COUNT(*) AS n FROM members"),
    db.prepare("SELECT COUNT(*) AS n FROM matches"),
    db.prepare("SELECT COUNT(*) AS n FROM sprites"),
  ]);
  const count = (r: D1Result) => (r.results[0] as { n: number }).n;

  const cards = [
    { href: "/admin/members", label: "Thành viên", value: count(members), hint: "Thông tin, trang bị, bộ dạng" },
    { href: "/admin/matches", label: "Trận đấu", value: count(matches), hint: "Sửa / xoá, Elo tự tính lại" },
    { href: "/admin/sprites", label: "Sprite", value: count(sprites), hint: "Đầu, thân, chân, Yoroi" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Quản trị</PageTitle>
      <p className="text-sm text-muted">Xin chào {admin.username}.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={cardClass + " p-4 hover:bg-surface-raised"}>
            <p className="text-xs text-muted">{c.label}</p>
            <p className="font-display text-3xl font-bold">{c.value}</p>
            <p className="mt-1 text-xs text-muted">{c.hint}</p>
          </Link>
        ))}
      </div>
      <Link
        href="/matches/new"
        className="w-fit rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        Ghi trận đấu mới
      </Link>
    </div>
  );
}
