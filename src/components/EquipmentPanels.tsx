"use client";

import { useState } from "react";
import type { Equipment, InfoLine } from "@/lib/equipment";
import type { Appearance } from "@/lib/members";
import { EquipmentPanel, InfoPanel, WINDOW_WIDTH } from "@/components/EquipmentPanel";

export interface PanelData {
  key: string;
  /** Shown above the window ("Chủ thân" / "Phân thân"). */
  label: string;
  equipment: Equipment;
  appearance: Appearance;
  info: InfoLine[];
}

/**
 * One holder's window, like the game's: the title arrows flip between the
 * "Trang bị" and "Thông tin" tabs.
 *
 * Both tabs stay mounted, stacked in one grid cell (so the window keeps the
 * taller tab's height); the hidden one is only visibility-hidden, so its
 * animations keep running and a flip doesn't restart the dots / breathing.
 */
export function HolderWindow({
  equipment,
  appearance,
  info,
}: {
  equipment: Equipment;
  appearance: Appearance;
  info: InfoLine[];
}) {
  const [tab, setTab] = useState<"gear" | "info">("gear");
  const flip = () => setTab((t) => (t === "gear" ? "info" : "gear"));
  const layer = (which: "gear" | "info") => ({
    className: tab === which ? undefined : "invisible",
    style: { gridArea: "1 / 1" },
    "aria-hidden": tab !== which,
  });

  return (
    <div className="grid">
      <div {...layer("gear")}>
        <EquipmentPanel equipment={equipment} appearance={appearance} onPrev={flip} onNext={flip} />
      </div>
      <div {...layer("info")}>
        <InfoPanel info={info} onPrev={flip} onNext={flip} />
      </div>
    </div>
  );
}

/** The profile's windows, one per holder (main body, clone), stacked. */
export function EquipmentPanels({ panels }: { panels: PanelData[] }) {
  if (panels.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {panels.map((p) => (
        <section key={p.key}>
          <h2
            className="mx-auto mb-1 text-xs font-semibold uppercase tracking-wider text-muted"
            style={{ maxWidth: WINDOW_WIDTH }}
          >
            {p.label}
          </h2>
          <HolderWindow equipment={p.equipment} appearance={p.appearance} info={p.info} />
        </section>
      ))}
    </div>
  );
}
