"use client";

import { useState } from "react";

// Calls a Phase 3 integration and shows the resulting status inline.
// `variant="hero"` styles it for the dark report hero; otherwise a normal tb-btn.
export function IntegrationButton({
  provider,
  projectId,
  icon,
  label,
  variant = "default",
}: {
  provider: string;
  projectId: string;
  icon: string;
  label: string;
  variant?: "default" | "hero";
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/integrations/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      setMsg({ ok: !!data.ok, text: data.message ?? (res.ok ? "Done" : "Failed") });
    } catch {
      setMsg({ ok: false, text: "Request failed" });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <button className={variant === "hero" ? "rh-btn" : "tb-btn"} onClick={run} disabled={busy}>
        <i className={`ti ${icon}`} /> {busy ? "Working…" : label}
      </button>
      {msg && (
        <span
          role="status"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 10,
            fontSize: 11,
            lineHeight: 1.4,
            padding: "6px 10px",
            borderRadius: 6,
            background: msg.ok ? "var(--green-light)" : "var(--amber-light)",
            color: msg.ok ? "var(--green-text)" : "var(--amber-text)",
            border: "1px solid var(--border)",
            width: 240,
          }}
        >
          {msg.text}
        </span>
      )}
    </span>
  );
}
