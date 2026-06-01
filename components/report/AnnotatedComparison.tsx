"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Annotation, AnnotationMap } from "@/types/report";

// Konva relies on the DOM canvas — never SSR it.
const AnnotatedScreen = dynamic(() => import("@/components/report/AnnotatedScreen"), {
  ssr: false,
  loading: () => <div style={{ height: 190, fontSize: 11, color: "var(--text3)" }}>Loading canvas…</div>,
});

export function AnnotatedComparison({
  reportId,
  initial,
  beforeImage,
  afterImage,
}: {
  reportId: string;
  initial: AnnotationMap;
  beforeImage?: string | null;
  afterImage?: string | null;
}) {
  const [map, setMap] = useState<AnnotationMap>(initial);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  function update(key: string, anns: Annotation[]) {
    setMap((m) => ({ ...m, [key]: anns }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    await fetch("/api/report/annotate", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, annotations: map }),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <AnnotatedScreen label="Before — drag to annotate" tone="before" initial={map.before ?? []} imageUrl={beforeImage} onChange={(a) => update("before", a)} />
        <AnnotatedScreen label="After — drag to annotate" tone="after" initial={map.after ?? []} imageUrl={afterImage} onChange={(a) => update("after", a)} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="tb-btn" onClick={save} disabled={busy}>
          <i className="ti ti-device-floppy" /> {busy ? "Saving…" : saved ? "Saved!" : "Save annotations"}
        </button>
      </div>
    </>
  );
}
