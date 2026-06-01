"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiProgress, useStepProgress, type AiStep } from "@/components/ai/AiProgress";

const REPORT_STEPS: AiStep[] = [
  { chip: "assembling", label: "Assembling the report from the KPI matrix" },
  { chip: "screens", label: "Preparing before / after screen comparison" },
  { chip: "charts", label: "Building KPI charts and persona heatmap" },
  { chip: "share link", label: "Generating the shareable link" },
];

export function GenerateReportButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prog = useStepProgress(REPORT_STEPS.length, busy);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/report/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Report generation failed");
    else router.refresh();
    setBusy(false);
  }

  return (
    <>
      {busy && (
        <div style={{ marginBottom: 14 }}>
          <AiProgress steps={REPORT_STEPS} step={prog.step} progress={prog.progress} tone="green" />
        </div>
      )}
      <div className="inline-actions" style={{ border: "none", marginTop: 0, paddingTop: 0 }}>
        {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        <button className="tb-btn primary" onClick={run} disabled={busy}>
          <i className={`ti ${busy ? "ti-loader-2" : "ti-file-analytics"}`} /> {busy ? "Building…" : "Generate report"}
        </button>
      </div>
    </>
  );
}
