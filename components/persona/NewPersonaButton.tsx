"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewPersonaButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ name: "", occupation: "", role_level: "senior", tech_comfort: "medium", location: "", traits: "", goals: "", frustrations: "" });

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function create() {
    if (!f.name.trim()) { setError("Name is required"); return; }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/persona", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        occupation: f.occupation,
        role_level: f.role_level,
        tech_comfort: f.tech_comfort,
        location: f.location,
        traits: f.traits.split(",").map((t) => t.trim()).filter(Boolean),
        goals: f.goals,
        frustrations: f.frustrations,
      }),
    });
    if (res.ok) {
      setOpen(false);
      setF({ name: "", occupation: "", role_level: "senior", tech_comfort: "medium", location: "", traits: "", goals: "", frustrations: "" });
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Could not create persona");
    }
    setBusy(false);
  }

  return (
    <>
      <button className="tb-btn primary" onClick={() => setOpen(true)}><i className="ti ti-plus" /> New persona</button>
      {open && (
        <div className="overlay open" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhd"><div className="mhd-t">New library persona</div><i className="ti ti-x mhd-close" onClick={() => setOpen(false)} /></div>
            <div className="mbody" style={{ maxHeight: "72vh", overflowY: "auto" }}>
              <div className="mfg"><label className="mfl">Name</label><input className="input" placeholder="e.g. Rajesh M." value={f.name} onChange={set("name")} /></div>
              <div className="mfrow">
                <div className="mfg"><label className="mfl">Occupation</label><input className="input" placeholder="Sr. Sys Admin" value={f.occupation} onChange={set("occupation")} /></div>
                <div className="mfg"><label className="mfl">Location</label><input className="input" placeholder="Bangalore, India" value={f.location} onChange={set("location")} /></div>
              </div>
              <div className="mfrow">
                <div className="mfg"><label className="mfl">Role level</label>
                  <select className="input" value={f.role_level} onChange={set("role_level")}>
                    <option value="junior">Junior</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="lead">Lead</option><option value="manager">Manager</option><option value="director">Director</option>
                  </select>
                </div>
                <div className="mfg"><label className="mfl">Tech comfort</label>
                  <select className="input" value={f.tech_comfort} onChange={set("tech_comfort")}>
                    <option value="low">Beginner</option><option value="medium">Intermediate</option><option value="high">Expert</option>
                  </select>
                </div>
              </div>
              <div className="mfg"><label className="mfl">Behavioural traits <small>(comma-separated)</small></label><input className="input" placeholder="Power user, Keyboard-first, Detail-oriented" value={f.traits} onChange={set("traits")} /></div>
              <div className="mfg"><label className="mfl">Goals</label><textarea className="input" style={{ minHeight: 52, resize: "vertical" }} value={f.goals} onChange={set("goals")} /></div>
              <div className="mfg"><label className="mfl">Frustrations</label><textarea className="input" style={{ minHeight: 52, resize: "vertical" }} value={f.frustrations} onChange={set("frustrations")} /></div>
              {error && <div style={{ fontSize: 11, color: "var(--red-text)" }}>{error}</div>}
            </div>
            <div className="mft-footer">
              <button className="tb-btn" onClick={() => setOpen(false)}>Cancel</button>
              <button className="tb-btn primary" onClick={create} disabled={busy}><i className={`ti ${busy ? "ti-loader-2" : "ti-plus"}`} /> {busy ? "Creating…" : "Create persona"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
