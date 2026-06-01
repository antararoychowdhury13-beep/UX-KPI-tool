"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function ReportVersions({
  projectId,
  versions,
  current,
}: {
  projectId: string;
  versions: number[];
  current: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function newVersion() {
    setBusy(true);
    const res = await fetch("/api/report/version", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    if (res.ok) router.refresh();
    setBusy(false);
  }

  return (
    <div className="report-versions">
      <span className="rv-label">Version</span>
      <div className="rv-pills">
        {versions.map((v) => (
          <Link
            key={v}
            href={`/projects/${projectId}/report${v === Math.max(...versions) ? "" : `?v=${v}`}`}
            className={`rv-pill ${v === current ? "active" : ""}`}
          >
            v{v}
          </Link>
        ))}
      </div>
      <button className="tb-btn" onClick={newVersion} disabled={busy} style={{ marginLeft: "auto" }}>
        <i className={`ti ${busy ? "ti-loader-2" : "ti-versions"}`} /> {busy ? "Generating…" : "New version"}
      </button>
    </div>
  );
}
