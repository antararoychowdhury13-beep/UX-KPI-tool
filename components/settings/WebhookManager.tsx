"use client";

import { useEffect, useState } from "react";
import { WEBHOOK_EVENTS, type WebhookSubscription } from "@/types/webhook";

export function WebhookManager() {
  const [hooks, setHooks] = useState<WebhookSubscription[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/webhooks");
      if (res.ok) setHooks((await res.json()).webhooks ?? []);
    } catch {
      /* ignore */
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, event_types: events }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "Could not create webhook");
    else {
      setUrl("");
      await load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    setHooks((h) => h.filter((x) => x.id !== id));
  }

  async function toggle(h: WebhookSubscription) {
    await fetch(`/api/webhooks/${h.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !h.is_active }),
    });
    setHooks((xs) => xs.map((x) => (x.id === h.id ? { ...x, is_active: !x.is_active } : x)));
  }

  return (
    <div className="card">
      <div className="rs-title">
        <i className="ti ti-webhook" /> Webhooks
      </div>
      <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
        POST HMAC-signed events to your endpoint. Verify with the <span className="mono">X-UXKPI-Signature</span> header.
      </div>

      {hooks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {hooks.map((h) => (
            <div key={h.id} className="wh-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="wh-url">{h.url}</div>
                <div className="wh-events">{h.event_types.length ? h.event_types.join(", ") : "all events"}</div>
              </div>
              <button className={`badge ${h.is_active ? "b-done" : "b-draft"}`} onClick={() => toggle(h)} style={{ border: "none", cursor: "pointer" }}>
                {h.is_active ? "active" : "paused"}
              </button>
              <button className="wh-del" onClick={() => remove(h.id)} aria-label="Delete">
                <i className="ti ti-trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        className="input"
        placeholder="https://your-endpoint.com/webhook"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      <div className="tag-selector" style={{ marginBottom: 10 }}>
        {WEBHOOK_EVENTS.map((ev) => (
          <span
            key={ev}
            className={`tag-sel ${events.includes(ev) ? "selected" : ""}`}
            onClick={() => setEvents((s) => (s.includes(ev) ? s.filter((x) => x !== ev) : [...s, ev]))}
          >
            {ev}
          </span>
        ))}
      </div>
      {error && <div style={{ fontSize: 11, color: "var(--red-text)", marginBottom: 8 }}>{error}</div>}
      <button className="tb-btn primary" onClick={add} disabled={busy || !url}>
        <i className="ti ti-plus" /> {busy ? "Adding…" : "Add webhook"}
      </button>
    </div>
  );
}
