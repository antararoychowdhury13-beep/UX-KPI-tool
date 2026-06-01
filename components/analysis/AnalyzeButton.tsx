"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AnalyzeButton({
  projectId,
  canAnalyze,
  nextHref,
}: {
  projectId: string;
  canAnalyze: boolean;
  nextHref: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setStatus("Queuing analysis…");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to start analysis");
      setStatus(null);
      return;
    }

    const jobId = data.jobId as string;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const poll = await fetch(`/api/analyze/${jobId}`);
      const pd = await poll.json();
      setStatus(`Analysis ${pd.job.status}…`);
      if (pd.job.status === "completed") {
        router.refresh();
        router.push(nextHref);
        return;
      }
      if (pd.job.status === "failed") {
        setError(pd.job.error ?? "Analysis failed");
        setStatus(null);
        return;
      }
    }
    setError("Analysis timed out");
    setStatus(null);
  }

  return (
    <div className="inline-actions" style={{ alignItems: "center" }}>
      {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
      {!canAnalyze && (
        <span style={{ fontSize: 11, color: "var(--text3)", marginRight: "auto" }}>
          Upload at least one before and one after screen.
        </span>
      )}
      <button className="tb-btn primary" onClick={run} disabled={!canAnalyze || !!status}>
        <i className="ti ti-wand" /> {status ?? "Run analysis & continue"}
      </button>
    </div>
  );
}
