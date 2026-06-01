"use client";

import { useEffect, useState } from "react";

export interface AiStep {
  /** short text for the step chip */
  chip: string;
  /** fuller sentence shown in the status label */
  label: string;
}

export type ProgressTone = "cyan" | "blue" | "green";

/**
 * Drives a simulated step index + progress while a task is in flight. Single-call AI tasks (flow
 * analysis, persona gen, KPI, report) have no real per-step events, so this animates through the
 * known phases and holds just under 100% until `busy` clears (the bar then unmounts on success).
 * For genuinely streamed tasks (synthetic testing) use the SSE events directly instead.
 */
export function useStepProgress(total: number, busy: boolean, intervalMs = 1400) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!busy) {
      setStep(0);
      return;
    }
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, total - 1)), intervalMs);
    return () => clearInterval(id);
  }, [busy, total, intervalMs]);
  // Hold a touch under 100% — the task isn't truly done until busy clears.
  const progress = Math.min(94, Math.round(((step + 1) / Math.max(1, total)) * 100));
  return { step, progress };
}

/** The v2 AI status bar: pulsing dot + live label + done/current/todo step chips + progress bar. */
export function AiProgress({
  steps,
  step,
  progress,
  label,
  tone = "cyan",
}: {
  steps: AiStep[];
  step: number;
  progress: number;
  /** overrides the current step's label (e.g. a live persona name from SSE) */
  label?: string;
  tone?: ProgressTone;
}) {
  const current = steps[Math.min(step, steps.length - 1)];
  return (
    <>
      <div className="ai-bar">
        <div className="ai-pulse" />
        <div className="ai-label">{label ?? current?.label ?? "Working"}…</div>
        <div className="ai-steps">
          {steps.map((s, i) => (
            <span key={s.chip} className={`ai-step ${i < step ? "done" : i === step ? "curr" : "todo"}`}>
              {s.chip}
            </span>
          ))}
        </div>
      </div>
      <div className="prog-wrap" style={{ marginTop: 8, marginBottom: 0 }}>
        <div className="prog-track">
          <div className={`prog-fill ${tone}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
    </>
  );
}
