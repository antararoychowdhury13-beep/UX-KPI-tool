"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function QuotaEditor({ userId, quota }: { userId: string; quota: number }) {
  const router = useRouter();
  const [value, setValue] = useState(quota);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch("/api/admin/quota", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, quota_analyses: value }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 1500);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="input"
        style={{ width: 72, padding: "4px 8px" }}
      />
      <button className="tb-btn" onClick={save} disabled={busy || value === quota}>
        {busy ? "…" : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
