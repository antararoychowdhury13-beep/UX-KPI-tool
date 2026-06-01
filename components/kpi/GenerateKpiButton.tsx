"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AiProgress, useStepProgress, type AiStep } from "@/components/ai/AiProgress";

const KPI_STEPS: AiStep[] = [
  { chip: "loading tests", label: "Loading synthetic test results" },
  { chip: "aggregating", label: "Aggregating per-persona scores" },
  { chip: "inferring KPIs", label: "Inferring KPIs across categories" },
  { chip: "UX score", label: "Computing the composite UX score" },
  { chip: "recommendations", label: "Writing recommendations and tracking plan" },
];

export function GenerateKpiButton({
  projectId,
  label = "Generate KPI matrix",
}: {
  projectId: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prog = useStepProgress(KPI_STEPS.length, busy);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/kpi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Generation failed");
    else router.refresh();
    setBusy(false);
  }

  return (
    <>
      {busy && (
        <div style={{ marginBottom: 14 }}>
          <AiProgress steps={KPI_STEPS} step={prog.step} progress={prog.progress} tone="blue" />
        </div>
      )}
      <div className="inline-actions" style={{ border: "none", marginTop: 0, paddingTop: 0 }}>
        {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        <button className="tb-btn primary" onClick={run} disabled={busy}>
          <i className={`ti ${busy ? "ti-loader-2" : "ti-wand"}`} /> {busy ? "Generating…" : label}
        </button>
      </div>
    </>
  );
}
