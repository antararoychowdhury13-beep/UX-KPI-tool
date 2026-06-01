"use client";

import { useMemo, useState } from "react";
import { KPICard } from "@/components/kpi/KPICard";
import type { KPI } from "@/types/kpi";

const CATEGORIES = [
  "all",
  "efficiency",
  "satisfaction",
  "accessibility",
  "error_reduction",
  "learnability",
] as const;

export function KPIMatrix({ kpis }: { kpis: KPI[] }) {
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>("all");
  const filtered = useMemo(
    () => (filter === "all" ? kpis : kpis.filter((k) => k.category === filter)),
    [kpis, filter],
  );

  return (
    <>
      <div className="kpi-tabs-row">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`kpi-tab ${filter === c ? "active" : ""}`}
            onClick={() => setFilter(c)}
          >
            {c === "all" ? "All KPIs" : c.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="kpi-list">
        {filtered.map((k) => (
          <KPICard key={k.id} kpi={k} />
        ))}
      </div>
    </>
  );
}
