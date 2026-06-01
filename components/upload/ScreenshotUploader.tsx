"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import type { Screenshot, ScreenshotType } from "@/types/project";

export function ScreenshotUploader({
  projectId,
  type,
  initial,
}: {
  projectId: string;
  type: ScreenshotType;
  initial: Screenshot[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Screenshot[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      setError(null);
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("type", type);
      files.forEach((f) => form.append("files", f));

      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setItems((prev) =>
          [...prev, ...(data.screenshots as Screenshot[])].sort(
            (a, b) => a.sequence_order - b.sequence_order,
          ),
        );
        router.refresh();
      }
      setBusy(false);
    },
    [projectId, type, router],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: false,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif"] },
  });

  async function removeItem(id: string) {
    // Optimistic remove; revert on failure.
    const prev = items;
    setItems((xs) => xs.filter((s) => s.id !== id));
    const res = await fetch(`/api/upload/${id}?projectId=${encodeURIComponent(projectId)}`, { method: "DELETE" });
    if (!res.ok) {
      setItems(prev);
      setError("Could not remove that screenshot");
    } else {
      router.refresh();
    }
  }

  const isAfter = type === "after";

  return (
    <div>
      <div className="form-label">
        {isAfter ? "After screens" : "Before screens"}{" "}
        <small>{isAfter ? "(new UI)" : "(legacy UI)"}</small>
      </div>
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? "drag" : ""}`}
        style={isAfter ? { borderColor: "var(--blue)" } : { borderColor: "#b4b2a9" }}
      >
        <input {...getInputProps()} />
        <div className="uz-icon" style={isAfter ? { color: "var(--blue)" } : undefined}>
          <i className="ti ti-photo-up" />
        </div>
        <div className="uz-title">
          {busy ? "Uploading…" : `Drop ${isAfter ? "redesigned" : "before"} screenshots`}
        </div>
        <div className="uz-hint">PNG, JPG · Sequential naming (01-name.png)</div>

        {items.length > 0 && (
          // stopPropagation so clicking a thumbnail's × doesn't re-open the file dialog (dropzone root)
          <div className="thumb-row" onClick={(e) => e.stopPropagation()}>
            {items.map((s) => (
              <div
                key={s.id}
                className="thumb"
                title={s.screen_label || s.file_name}
                style={
                  isAfter
                    ? { background: "linear-gradient(135deg,#c5dcf5,#a8c8ee)" }
                    : undefined
                }
              >
                <span className="tn">{String(s.sequence_order).padStart(2, "0")}</span>
                <button
                  type="button"
                  className="thumb-del"
                  aria-label={`Remove ${s.file_name}`}
                  title="Remove"
                  onClick={(e) => { e.stopPropagation(); removeItem(s.id); }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            ))}
            <div
              className="thumb thumb-add"
              role="button"
              tabIndex={0}
              title="Add more"
              onClick={(e) => { e.stopPropagation(); open(); }}
              style={{ borderStyle: "dashed", background: "transparent" }}
            >
              <i className="ti ti-plus" style={{ fontSize: 14 }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 5, textAlign: "center" }}>
        {error ? (
          <span style={{ color: "var(--red-text)" }}>{error}</span>
        ) : (
          `${items.length} screen${items.length === 1 ? "" : "s"} uploaded`
        )}
      </div>
    </div>
  );
}
