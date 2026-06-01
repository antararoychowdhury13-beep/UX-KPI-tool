"use client";

import { useState } from "react";

// Downloads a server-rendered PDF (Puppeteer) when a share token is available; otherwise falls
// back to the browser print dialog.
export function ExportPdfButton({ token }: { token?: string }) {
  const [busy, setBusy] = useState(false);

  async function exportPdf() {
    if (!token) {
      window.print();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/report/export?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        window.print();
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ux-kpi-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="rh-btn" onClick={exportPdf} disabled={busy}>
      <i className="ti ti-download" /> {busy ? "Generating…" : "Export PDF"}
    </button>
  );
}
