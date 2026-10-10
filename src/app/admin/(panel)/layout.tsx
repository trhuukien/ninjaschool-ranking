import Link from "next/link";
import { logout } from "../actions/auth";

const LINKS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/members", label: "Thành viên" },
  { href: "/admin/matches", label: "Trận đấu" },
  { href: "/admin/sprites", label: "Sprite" },
  { href: "/admin/accounts", label: "Tài khoản" },
];

// Navigation only — layouts don't re-run on every navigation, so each page
// and action checks the admin session itself (requireAdmin).
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1 border-b border-border pb-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-raised hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
        <form action={logout} className="ml-auto">
          <button className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground">
            Đăng xuất
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
