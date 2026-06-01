"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TESTING_METHODS, type TestingMethod } from "@/types/persona";
import { ModelBadge } from "@/components/ai/ModelBadge";

export function TestingControls({
  projectId,
  hasResults,
  currentMethod,
  model,
}: {
  projectId: string;
  hasResults: boolean;
  currentMethod: TestingMethod;
  model: { label: string; model: string } | null;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<TestingMethod>(currentMethod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [howOpen, setHowOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const selected = TESTING_METHODS.find((m) => m.value === method);
  const [label, setLabel] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setProgress(0);
    setLabel("Starting…");
    try {
      const res = await fetch("/api/test/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, method }),
      });
      // Non-stream error responses (auth/rate/validation) come back as JSON.
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Testing failed");
        setBusy(false);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const evt = JSON.parse(line.slice(5).trim());
          if (evt.type === "step") {
            setLabel(evt.label);
            setProgress(evt.progress ?? 0);
          } else if (evt.type === "done") {
            finished = true;
          } else if (evt.type === "error") {
            setError(evt.message ?? "Testing failed");
          }
        }
      }
      if (finished) router.refresh();
    } catch {
      setError("Testing failed");
    } finally {
      setBusy(false);
      setLabel(null);
    }
  }

  return (
    <div className="method-panel">
      <div className="method-panel-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div className="method-panel-title">Testing method <span style={{ color: "var(--text3)", fontWeight: 400 }}>· {TESTING_METHODS.length} methods</span></div>
          <div className="method-panel-sub">Pick how the personas evaluate the before / after flows, then run.</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <ModelBadge model={model} />
          <button type="button" className="how-link" onClick={() => setHowOpen((o) => !o)}>
            <i className="ti ti-help-circle" /> How is this calculated?
          </button>
        </div>
      </div>

      {howOpen && (
        <div className="methodology">
          <div className="methodology-title"><i className="ti ti-flask" /> How synthetic testing works</div>
          <ol className="methodology-steps">
            <li>Each of your <b>synthetic personas</b> is run against the <b>before</b> and <b>after</b> flows.</li>
            <li>{model ? <><b>{model.label}</b> ({model.model})</> : <b>The active AI model</b>} evaluates each flow through the chosen lens — <b>{selected?.title ?? "the selected method"}</b> — using the flow description, the AI screen analysis, and the persona&apos;s traits.</li>
            <li>For each persona × flow it predicts a <b>task-success rate</b>, an <b>error likelihood</b>, <b>friction points</b> (with severity), and an overall <b>0–10 score</b>.</li>
            <li>Scores are averaged across personas into the <b>aggregate stats</b> below, then rolled into the KPI matrix and the composite UX score.</li>
          </ol>
          <div className="methodology-note">
            <i className="ti ti-info-circle" /> These are <b>AI-simulated predictions</b> to direct design decisions early — validate the top findings with a short real-user study before launch.
          </div>
        </div>
      )}

      <div className="method-grid">
        {TESTING_METHODS.map((m) => (
          <button
            key={m.value}
            className={`method-card ${method === m.value ? "selected" : ""}`}
            onClick={() => setMethod(m.value)}
            type="button"
          >
            <i className={`ti ${m.icon}`} />
            <div className="method-card-title">{m.title}</div>
            <div className="method-card-desc">{m.desc}</div>
          </button>
        ))}
      </div>
      {busy && label && (
        <>
          <div className="ai-bar">
            <div className="ai-pulse" />
            <div className="ai-label">{label}…</div>
            <div className="ai-steps">
              <span className="ai-step curr">{progress}%</span>
            </div>
          </div>
          <div className="prog-wrap" style={{ marginBottom: 0 }}>
            <div className="prog-track">
              <div className="prog-fill cyan" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </>
      )}

      <div className="inline-actions">
        {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        <button className="tb-btn primary" onClick={run} disabled={busy}>
          <i className={`ti ${busy ? "ti-loader-2" : "ti-test-pipe"}`} />
          {busy ? "Running tests…" : hasResults ? "Re-run all tests" : "Run all tests"}
        </button>
      </div>
    </div>
  );
}
