"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/", label: "Bảng xếp hạng" },
  { href: "/matches", label: "Lịch sử trận" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-wide text-foreground"
          onClick={() => setOpen(false)}
        >
          <span className="text-accent-strong">忍</span> Ninjaschool
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} active={pathname === l.href}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <Link
          href="/matches/new"
          className="ml-auto hidden rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 hover:bg-accent-strong sm:inline-block"
        >
          + Ghi trận đấu
        </Link>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Mở menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground sm:hidden"
        >
          <span className="sr-only">Menu</span>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {open && (
        <div className="border-t border-border px-4 pb-3 sm:hidden">
          <div className="flex flex-col gap-1 pt-2">
            {LINKS.map((l) => (
              <NavLink key={l.href} href={l.href} active={pathname === l.href} onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
            <Link
              href="/matches/new"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-md bg-accent px-3 py-2 text-center text-sm font-semibold text-white hover:bg-accent-strong"
            >
              + Ghi trận đấu
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (active ? "bg-surface-raised text-foreground" : "text-muted hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}
