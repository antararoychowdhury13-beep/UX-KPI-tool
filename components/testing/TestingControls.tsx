"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TESTING_METHODS, type TestingMethod } from "@/types/persona";

export function TestingControls({
  projectId,
  hasResults,
  currentMethod,
}: {
  projectId: string;
  hasResults: boolean;
  currentMethod: TestingMethod;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<TestingMethod>(currentMethod);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
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
      <div className="method-panel-head">
        <div className="method-panel-title">Testing method</div>
        <div className="method-panel-sub">Pick how the personas evaluate the before / after flows, then run.</div>
      </div>
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
