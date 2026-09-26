"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ImportButton } from "@/components/ImportButton";

const LINKS = [
  { href: "/", label: "Bảng xếp hạng" },
  { href: "/matches", label: "Lịch sử trận" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer on route change, and stop the page scrolling behind it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:gap-6 sm:px-6">
        <Link href="/" className="font-display text-lg font-bold tracking-wide text-foreground">
          <span className="text-accent-strong">忍</span> Ninjaschool
        </Link>

        <div className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} active={pathname === l.href}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <ImportButton />
          <Link
            href="/matches/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-sm shadow-accent/30 hover:bg-accent-strong"
          >
            Ghi trận đấu
          </Link>
        </div>

        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground sm:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
      </nav>
    </header>

    {/* Backdrop */}
    <div
      onClick={() => setOpen(false)}
      aria-hidden="true"
      className={
        "fixed inset-0 z-30 bg-black/60 transition-opacity duration-200 sm:hidden " +
        (open ? "opacity-100" : "pointer-events-none opacity-0")
      }
    />

    {/* Slide-in drawer */}
    <div
      className={
        "fixed inset-y-0 right-0 z-40 flex w-72 max-w-[85vw] flex-col gap-1 border-l border-border bg-surface p-4 shadow-xl transition-transform duration-200 sm:hidden " +
        (open ? "translate-x-0" : "translate-x-full")
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-base font-bold tracking-wide">Menu</span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Đóng menu"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {LINKS.map((l) => (
        <NavLink key={l.href} href={l.href} active={pathname === l.href} onClick={() => setOpen(false)}>
          {l.label}
        </NavLink>
      ))}

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
        <ImportButton />
        <Link
          href="/matches/new"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-md bg-accent px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-accent-strong"
        >
          Ghi trận đấu
        </Link>
      </div>
    </div>
    </>
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
