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

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, method }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Testing failed");
    else router.refresh();
    setBusy(false);
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
