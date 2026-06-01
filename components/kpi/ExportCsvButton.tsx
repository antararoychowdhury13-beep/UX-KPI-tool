"use client";

import type { KPI } from "@/types/kpi";

const HEADERS = [
  "name",
  "category",
  "before_score",
  "after_score",
  "delta",
  "delta_direction",
  "confidence_level",
  "confidence_score",
  "measurement_method",
];

export function ExportCsvButton({ kpis }: { kpis: KPI[] }) {
  function exportCsv() {
    const rows = kpis.map((k) =>
      HEADERS.map((h) => {
        const v = (k as unknown as Record<string, unknown>)[h];
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(","),
    );
    const csv = [HEADERS.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kpi-matrix.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button className="tb-btn" onClick={exportCsv}>
      <i className="ti ti-download" /> Export CSV
    </button>
  );
}
