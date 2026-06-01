"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunTestsButton({
  projectId,
  hasResults,
}: {
  projectId: string;
  hasResults: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Testing failed");
    else router.refresh();
    setBusy(false);
  }

  return (
    <>
      {error && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
      <button className="tb-btn primary" onClick={run} disabled={busy}>
        <i className="ti ti-test-pipe" /> {busy ? "Running tests…" : hasResults ? "Re-run all tests" : "Run all tests"}
      </button>
    </>
  );
}
