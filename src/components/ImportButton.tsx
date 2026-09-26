"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ImportButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/import", { method: "POST" });
        if (!res.ok) return;
        router.refresh();
      } catch {
        // ignore — user can just retry
      }
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-raised disabled:opacity-50"
    >
      {isPending ? "Đang đồng bộ..." : "Đồng bộ"}
    </button>
  );
}
