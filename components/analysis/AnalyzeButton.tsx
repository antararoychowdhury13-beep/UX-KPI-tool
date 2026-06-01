"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Display steps for the AI status bar (spec v2 §5 analyzeScreenshots sequence).
const STEPS = ["reading before", "reading after", "diffing flows", "extracting changes", "summarizing"];

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
  const [step, setStep] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const busy = !!status;

  // Cycle the status-bar steps while a run is in flight (inline analysis is one await, so the
  // chips are a progress affordance rather than real per-step events).
  useEffect(() => {
    if (busy) {
      timer.current = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1100);
    } else {
      if (timer.current) clearInterval(timer.current);
      setStep(0);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [busy]);

  async function run() {
    setError(null);
    setStatus("Reading screens…");
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

    // Inline runs (no external queue) finish synchronously — proceed without polling.
    if (data.status === "completed") {
      router.refresh();
      router.push(nextHref);
      return;
    }
    if (data.status === "failed") {
      setError("Analysis failed");
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
    <>
      {busy && (
        <div className="ai-bar">
          <div className="ai-pulse" />
          <div className="ai-label">
            Analysing screens — <b>{STEPS[step]}</b>…
          </div>
          <div className="ai-steps">
            {STEPS.map((s, i) => (
              <span key={s} className={`ai-step ${i < step ? "done" : i === step ? "curr" : "todo"}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="inline-actions" style={{ alignItems: "center" }}>
        {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        {!canAnalyze && (
          <span style={{ fontSize: 11, color: "var(--text3)", marginRight: "auto" }}>
            Upload at least one before and one after screen.
          </span>
        )}
        <button className="tb-btn primary" onClick={run} disabled={!canAnalyze || busy}>
          <i className={`ti ${busy ? "ti-loader-2" : "ti-wand"}`} /> {status ?? "Run analysis & continue"}
        </button>
      </div>
    </>
  );
}
