"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ImportButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleClick = () => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/import", { method: "POST" });
        const data = (await res.json()) as {
          inserted?: number;
          updated?: number;
          skipped?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Import thất bại");
        setMessage(
          `Đã đồng bộ: ${data.inserted} thêm mới, ${data.updated} cập nhật, ${data.skipped} bỏ qua.`,
        );
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import thất bại");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-raised disabled:opacity-50"
      >
        {isPending ? "Đang đồng bộ..." : "Đồng bộ từ Google Sheet"}
      </button>
      {message && <p className="text-xs text-green-400">{message}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
