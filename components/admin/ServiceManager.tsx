"use client";

import { useState } from "react";
import type { AIService } from "@/types/report";

type ServiceView = AIService & { live: boolean };

const EMPTY = { name: "", slug: "", role: "", provider: "", model: "", env_var: "" };

export function ServiceManager({ initial }: { initial: ServiceView[] }) {
  const [services, setServices] = useState<ServiceView[]>(initial);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setForm(EMPTY);
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  // The API returns the fresh list but without `live` (server-only). Preserve live flags we know,
  // default new/custom services to false until the page is reloaded.
  function applyList(list: AIService[]) {
    const liveBySlug = new Map(services.map((s) => [s.slug, s.live]));
    setServices(list.map((s) => ({ ...s, live: liveBySlug.get(s.slug) ?? false })));
  }

  async function call(method: string, body: object): Promise<boolean> {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/service", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Request failed");
      return false;
    }
    if (data.services) applyList(data.services);
    return true;
  }

  async function create() {
    if (await call("POST", form)) resetForm();
  }

  async function saveEdit(id: string) {
    if (await call("PATCH", { id, ...form })) resetForm();
  }

  async function toggle(s: ServiceView) {
    await call("PATCH", { id: s.id, enabled: !s.enabled });
  }

  async function remove(s: ServiceView) {
    if (!confirm(`Remove "${s.name}"? This cannot be undone.`)) return;
    await call("DELETE", { id: s.id });
  }

  function startEdit(s: ServiceView) {
    setEditingId(s.id);
    setAdding(false);
    setError(null);
    setForm({
      name: s.name,
      slug: s.slug,
      role: s.role,
      provider: s.provider ?? "",
      model: s.model ?? "",
      env_var: s.env_var ?? "",
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {services.map((s) =>
        editingId === s.id ? (
          <div key={s.id} className="card">
            <ServiceForm form={form} setForm={setForm} editing slugLocked />
            {error && <p style={{ fontSize: 11, color: "var(--red-text)", marginTop: 8 }}>{error}</p>}
            <div className="inline-actions">
              <button className="tb-btn" onClick={resetForm} disabled={busy}>Cancel</button>
              <button className="tb-btn primary" onClick={() => saveEdit(s.id)} disabled={busy}>
                <i className="ti ti-check" /> Save changes
              </button>
            </div>
          </div>
        ) : (
          <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                {s.name}
                <span className="mono" style={{ fontSize: 10, color: "var(--text3)" }}>{s.slug}</span>
                {s.builtin && <span className="badge b-draft">built-in</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>
                {s.role}
                {s.model ? ` · ${s.model}` : ""}
                {s.env_var ? ` · ${s.env_var}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <span className={`badge ${s.live ? "b-done" : "b-proc"}`}>{s.live ? "live key" : "mock"}</span>
              <button className={`tb-btn ${s.enabled ? "primary" : ""}`} onClick={() => toggle(s)} disabled={busy} title="Enable/disable">
                <i className={`ti ${s.enabled ? "ti-toggle-right" : "ti-toggle-left"}`} />
                {s.enabled ? "Enabled" : "Disabled"}
              </button>
              <button className="tb-btn" onClick={() => startEdit(s)} disabled={busy} aria-label="Edit">
                <i className="ti ti-pencil" />
              </button>
              <button className="tb-btn" onClick={() => remove(s)} disabled={busy} aria-label="Remove">
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Add AI service</div>
          <ServiceForm form={form} setForm={setForm} />
          {error && <p style={{ fontSize: 11, color: "var(--red-text)", marginTop: 8 }}>{error}</p>}
          <div className="inline-actions">
            <button className="tb-btn" onClick={resetForm} disabled={busy}>Cancel</button>
            <button className="tb-btn primary" onClick={create} disabled={busy || !form.name.trim()}>
              <i className="ti ti-plus" /> Add service
            </button>
          </div>
        </div>
      ) : (
        <button
          className="new-card"
          onClick={() => { resetForm(); setAdding(true); }}
          style={{ cursor: "pointer" }}
        >
          <i className="ti ti-plus" />
          <div className="new-card-title">Add AI service</div>
          <div className="new-card-sub">Register a new model/provider</div>
        </button>
      )}
    </div>
  );
}

function ServiceForm({
  form,
  setForm,
  editing = false,
  slugLocked = false,
}: {
  form: typeof EMPTY;
  setForm: (f: typeof EMPTY) => void;
  editing?: boolean;
  slugLocked?: boolean;
}) {
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });
  return (
    <>
      <div className="form-row">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Name</label>
          <input className="form-input" value={form.name} onChange={set("name")} placeholder="OpenAI GPT-4o" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Slug <small>{slugLocked ? "(locked)" : "(auto if blank)"}</small></label>
          <input className="form-input" value={form.slug} onChange={set("slug")} placeholder="gpt-4o" disabled={slugLocked || editing} />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
        <label className="form-label">Role / description</label>
        <input className="form-input" value={form.role} onChange={set("role")} placeholder="Alternate persona generation" />
      </div>
      <div className="form-row" style={{ marginTop: 12, marginBottom: 0 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Provider</label>
          <input className="form-input" value={form.provider} onChange={set("provider")} placeholder="openai" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Model</label>
          <input className="form-input" value={form.model} onChange={set("model")} placeholder="gpt-4o" />
        </div>
      </div>
      <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
        <label className="form-label">API key env var</label>
        <input className="form-input mono" value={form.env_var} onChange={set("env_var")} placeholder="OPENAI_API_KEY" />
      </div>
    </>
  );
}
