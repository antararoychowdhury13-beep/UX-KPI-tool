"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <div className="inline-actions" style={{ border: "none", marginTop: 0, paddingTop: 0 }}>
      {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
      <button className="tb-btn primary" onClick={run} disabled={busy}>
        <i className="ti ti-wand" /> {busy ? "Generating…" : label}
      </button>
    </div>
  );
}
