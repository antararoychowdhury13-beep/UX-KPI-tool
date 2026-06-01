"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TESTING_METHODS,
  METHOD_CATEGORIES,
  type MethodCategory,
  type TestingMethodDef,
} from "@/types/persona";
import { EVAL_STEPS, DEFAULT_ASSIGNMENTS, type ModelAssignments } from "@/types/models";

// model.color → CSS var
const COLOR_VAR: Record<string, string> = {
  cyan: "var(--blue)", teal: "var(--teal)", green: "var(--green)", amber: "var(--amber)",
  orange: "var(--orange)", purple: "var(--purple)", red: "var(--red)", yellow: "var(--yellow)",
};
const BADGE_TONE: Record<string, string> = {
  free: "green", fast: "teal", vis: "purple", reason: "blue", code: "orange",
};
const COST_PILL: Record<string, string> = { free: "free", low: "$", med: "$$", high: "$$$" };

type ModelLite = {
  id: string; name: string; provider: string; color: string; cost: string;
  badges: string[]; desc: string; available: boolean;
};

const FLOW_MODES = [
  { id: "single", icon: "ti-square", title: "Single Flow", desc: "Evaluate one flow in isolation — a baseline audit without a redesign to compare.", tag: "1 flow · baseline", flows: 1 },
  { id: "compare", icon: "ti-arrows-left-right", title: "Before vs After", desc: "Test both flows and generate delta scores. Standard mode for redesign validation.", tag: "2 flows · delta scoring", flows: 2 },
  { id: "multi", icon: "ti-layers-difference", title: "Multi-variant", desc: "Compare 3+ design variants simultaneously. A/B/C concept testing.", tag: "3+ flows · ranking", flows: 3 },
] as const;

export function TestingEngine({
  projectId,
  personaCount,
  screenCount,
  currentMethod,
  hasResults,
}: {
  projectId: string;
  personaCount: number;
  screenCount: number;
  currentMethod: string;
  hasResults: boolean;
}) {
  const router = useRouter();
  const [models, setModels] = useState<ModelLite[]>([]);
  const [flowMode, setFlowMode] = useState<"single" | "compare" | "multi">("compare");
  const [assign, setAssign] = useState<ModelAssignments>({ ...DEFAULT_ASSIGNMENTS });
  const [selected, setSelected] = useState<string[]>([currentMethod || "heuristic"]);
  const [detailId, setDetailId] = useState<string | null>(currentMethod || "heuristic");
  const [filter, setFilter] = useState<MethodCategory | "all">("all");
  const [pickerStep, setPickerStep] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [custom, setCustom] = useState<{ id: string; name: string; desc: string; model: string; scope: string }[]>([]);
  const [modal, setModal] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runLabel, setRunLabel] = useState<string>("Ready — click Start to begin");
  const [runStep, setRunStep] = useState(0); // 0..4 chip index
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    fetch("/api/models").then((r) => r.json()).then((d) => setModels(d.models ?? [])).catch(() => {});
  }, []);

  // Load saved model assignments + custom tests for this project (self-healing → defaults).
  useEffect(() => {
    fetch(`/api/models/assign/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.assignments) setAssign({ ...DEFAULT_ASSIGNMENTS, ...d.assignments, method_overrides: d.assignments.method_overrides ?? {} });
      })
      .catch(() => {})
      .finally(() => { loadedRef.current = true; });
    fetch(`/api/test/custom?projectId=${projectId}`)
      .then((r) => r.json())
      .then((d) => setCustom((d.tests ?? []).map((t: { id: string; name: string; description: string; ai_model: string; scope: string }) => ({ id: t.id, name: t.name, desc: t.description, model: t.ai_model, scope: t.scope }))))
      .catch(() => {});
  }, [projectId]);

  // Persist assignment changes (best-effort) once initial load is done.
  useEffect(() => {
    if (!loadedRef.current) return;
    fetch(`/api/models/assign/${projectId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(assign) }).catch(() => {});
  }, [assign, projectId]);

  const modelById = (id: string): ModelLite | undefined => models.find((m) => m.id === id);
  const dotColor = (id: string) => COLOR_VAR[modelById(id)?.color ?? "cyan"] ?? "var(--blue)";

  function setStepModel(step: string, id: string) {
    setAssign((a) => ({ ...a, [step]: id }));
    setPickerStep(null);
    setPickerQuery("");
  }

  function toggleMethod(id: string) {
    setSelected((s) => {
      if (s.includes(id)) {
        const next = s.filter((x) => x !== id);
        if (detailId === id) setDetailId(next[0] ?? null);
        return next;
      }
      if (s.length >= 3) {
        setError("Max 3 methods — remove one first.");
        setTimeout(() => setError(null), 2000);
        return s;
      }
      setDetailId(id);
      return [...s, id];
    });
  }

  const filtered = filter === "all" ? TESTING_METHODS : TESTING_METHODS.filter((m) => m.category === filter);
  const detail = TESTING_METHODS.find((m) => m.value === detailId) ?? null;
  const flows = FLOW_MODES.find((f) => f.id === flowMode)?.flows ?? 1;
  const methodCount = selected.length || 1;
  const aiCalls = methodCount * Math.max(1, personaCount) * flows * 4;

  async function startRun() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    const methods = selected.length ? selected : ["heuristic"];
    try {
      for (let i = 0; i < methods.length; i++) {
        const mId = methods[i];
        const model = assign.method_overrides?.[mId] || assign.eval;
        const def = TESTING_METHODS.find((m) => m.value === mId);
        const res = await fetch("/api/test/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, method: mId, model }),
        });
        if (!res.ok || !res.body) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? "Test run failed");
          setBusy(false);
          return;
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const chunks = buf.split("\n\n");
          buf = chunks.pop() ?? "";
          for (const c of chunks) {
            const line = c.split("\n").find((l) => l.startsWith("data:"));
            if (!line) continue;
            const evt = JSON.parse(line.slice(5).trim());
            if (evt.type === "step") {
              const within = (evt.progress ?? 0) / 100;
              setProgress(Math.round(((i + within) / methods.length) * 100));
              setRunLabel(`${def?.title ?? mId} · ${evt.label} · ${model}`);
              setRunStep(Math.min(3, Math.floor(within * 4)));
            } else if (evt.type === "error") {
              setError(evt.message ?? "Test run failed");
            }
          }
        }
      }
      setProgress(100);
      setRunStep(4);
      setRunLabel("All tests complete — results updated");
      router.refresh();
    } catch {
      setError("Test run failed");
    } finally {
      setBusy(false);
    }
  }

  const pickerModels = models.filter(
    (m) => m.name.toLowerCase().includes(pickerQuery.toLowerCase()) || m.provider.toLowerCase().includes(pickerQuery.toLowerCase()),
  );
  const pickerGroups = pickerModels.reduce<Record<string, ModelLite[]>>((acc, m) => {
    (acc[m.provider] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div className="te">
      {/* 01 FLOW MODE */}
      <div className="te-seclabel">01 — Flow Mode</div>
      <div className="fm-grid">
        {FLOW_MODES.map((f) => (
          <button key={f.id} className={`fc ${flowMode === f.id ? "sel" : ""}`} onClick={() => setFlowMode(f.id)} type="button">
            <div className="fc-ck"><i className="ti ti-check" /></div>
            <i className={`ti ${f.icon} fc-icon`} />
            <div className="fc-title">{f.title}</div>
            <div className="fc-desc">{f.desc}</div>
            <div className="fc-tag">{f.tag}</div>
          </button>
        ))}
      </div>

      {/* 02 AI MODEL ASSIGNMENT */}
      <div className="te-seclabel">02 — AI Model Assignment</div>
      <div className="model-panel">
        <div className="mp-header">
          <div className="mp-title"><i className="ti ti-cpu" /> Model per evaluation step — click any to change</div>
          <div className="mp-formula">UX Score = Σ(score × weight) / Σ(weights)</div>
        </div>
        <div className="mp-body">
          <div className="te-model-grid">
            {EVAL_STEPS.map(({ key, label }) => {
              const m = modelById(assign[key]);
              return (
                <div key={key} className="msc" style={{ position: "relative" }}>
                  <div className="msc-step">{label}</div>
                  <div className="msc-selected" onClick={() => { setPickerStep(pickerStep === key ? null : key); setPickerQuery(""); }}>
                    <span className="model-dot" style={{ background: dotColor(assign[key]) }} />
                    <span className="msc-name">{assign[key]}</span>
                    <i className="ti ti-chevron-down msc-arrow" />
                  </div>
                  <div className="msc-role">{m?.desc ?? ""}</div>
                  {m && <div className={`msc-cost cost-${m.cost}`}>{m.cost === "free" ? "Free" : m.cost === "low" ? "Low cost" : m.cost === "med" ? "Medium" : "Higher cost"}{!m.available ? " · needs key" : ""}</div>}

                  {pickerStep === key && (
                    <>
                      <div className="picker-backdrop" onClick={() => setPickerStep(null)} />
                      <div className="model-dropdown open">
                        <div className="md-search">
                          <input autoFocus placeholder="Search models…" value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} />
                        </div>
                        <div className="md-groups">
                          {Object.entries(pickerGroups).map(([prov, ms]) => (
                            <div key={prov}>
                              <div className="md-group-label">{prov}</div>
                              {ms.map((mo) => (
                                <div key={mo.id} className={`md-option ${assign[key] === mo.id ? "selected" : ""}`} onClick={() => setStepModel(key, mo.id)}>
                                  <span className="model-dot" style={{ background: COLOR_VAR[mo.color] }} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="mdo-name">{mo.name}{!mo.available && <span className="mdo-needs"> · needs key</span>}</div>
                                    <div className="mdo-provider">{mo.desc}</div>
                                  </div>
                                  <div className="mdo-badges">
                                    {mo.badges.map((b) => <span key={b} className={`mdo-badge bd-${BADGE_TONE[b] ?? "blue"}`}>{b}</span>)}
                                    <span className="mdo-badge bd-cost">{COST_PILL[mo.cost]}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="formula-bar">
            <div className="fb-label">Composite UX Score Formula</div>
            <span className="fv-c">UX_Score</span> = <span className="fv-g">Σ</span>(<span className="fv-a">method_score_i</span> × <span className="fv-p">weight_i</span>) / <span className="fv-g">Σ</span>(<span className="fv-p">weight_i</span>) × 10<br />
            Delta: <span className="fv-c">UX_After</span> − <span className="fv-c">UX_Before</span> · Cache: input hash → 24h TTL → skip duplicate AI calls
          </div>
        </div>
      </div>

      {/* 03 TESTING METHODS */}
      <div className="te-seclabel">03 — Testing Methods <span className="te-hint">select up to 3</span></div>
      <div className="method-filter">
        {METHOD_CATEGORIES.map((c) => (
          <button key={c.value} className={`mft ${filter === c.value ? "active" : ""}`} onClick={() => setFilter(c.value)} type="button">{c.label}</button>
        ))}
      </div>
      <div className="te-method-grid">
        {filtered.map((m) => {
          const stepModel = assign.method_overrides?.[m.value] || assign[m.step as keyof ModelAssignments] as string;
          return (
            <button key={m.value} className={`mc ${selected.includes(m.value) ? "sel" : ""}`} onClick={() => toggleMethod(m.value)} type="button">
              <div className="mc-ck"><i className="ti ti-check" /></div>
              <div className="mc-n">{m.n}</div>
              <i className={`ti ${m.icon} mc-icon`} />
              <div className="mc-title">{m.title}</div>
              <div className="mc-desc">{m.desc}</div>
              <div className="mc-tags">{m.tags.map((t) => <span key={t} className="mc-tag">{t}</span>)}</div>
              <div className="mc-model-row">
                <span className="mc-mdot" style={{ background: dotColor(stepModel) }} />
                <span className="mc-mname">{stepModel}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* METHOD DETAIL */}
      {detail && <MethodDetail method={detail} assign={assign} models={models} dotColor={dotColor} onOverride={(id) => setAssign((a) => ({ ...a, method_overrides: { ...a.method_overrides, [detail.value]: id } }))} />}

      {/* 04 STEP GUIDE */}
      <div className="te-seclabel">04 — Evaluation Step Guide <span className="te-hint">click any step to expand</span></div>
      <StepGuide method={detail} model={detail ? (assign.method_overrides?.[detail.value] || (assign[detail.step as keyof ModelAssignments] as string)) : ""} dotColor={dotColor} />

      {/* 05 CUSTOM TESTS */}
      <div className="te-seclabel">05 — Custom Tests <span className="te-hint">add your own criteria</span></div>
      <div>
        {custom.map((c) => (
          <div key={c.id} className="ct-row">
            <div className="ct-icon"><i className="ti ti-checklist" /></div>
            <div className="ct-info"><div className="ct-n">{c.name}</div><div className="ct-d">{c.desc}</div></div>
            <div className="ct-model">{c.model}</div>
            <i className="ti ti-trash ct-del" onClick={() => { fetch(`/api/test/custom/${c.id}`, { method: "DELETE" }).catch(() => {}); setCustom((x) => x.filter((y) => y.id !== c.id)); }} />
          </div>
        ))}
      </div>
      <div className="ct-add" onClick={() => setModal(true)}>
        <i className="ti ti-plus" style={{ fontSize: 15, color: "var(--text3)" }} />
        <span>Add custom test criteria</span>
      </div>

      {/* RUN PANEL */}
      {showRun && (
        <div className="run-panel" ref={runRef}>
          <div className="rp-hd">
            <div className="rp-t">Test Run Configuration</div>
            <button className="tb-btn" onClick={() => setShowRun(false)}><i className="ti ti-x" /></button>
          </div>
          <div className="rp-stats">
            <div className="rps"><div className="rps-v">{methodCount}</div><div className="rps-l">Methods</div></div>
            <div className="rps"><div className="rps-v">{personaCount}</div><div className="rps-l">Personas</div></div>
            <div className="rps"><div className="rps-v">{flows}</div><div className="rps-l">Flows</div></div>
            <div className="rps"><div className="rps-v">~{aiCalls}</div><div className="rps-l">AI Calls</div></div>
          </div>
          <div className="ai-bar">
            <div className="ai-pulse" />
            <div className="ai-label">{runLabel}</div>
            <div className="ai-steps">
              {["reading", "eval", "scoring", "kpi"].map((s, i) => (
                <span key={s} className={`ai-step ${runStep > i ? "done" : runStep === i && busy ? "curr" : "todo"}`}>{s}</span>
              ))}
            </div>
          </div>
          <div className="prog-track" style={{ marginTop: 8 }}><div className="prog-fill cyan" style={{ width: `${progress}%` }} /></div>
          {error && <div style={{ fontSize: 11, color: "var(--red-text)", marginTop: 8 }}>{error}</div>}
          <div className="ia">
            <button className="tb-btn" onClick={() => setShowRun(false)} disabled={busy}>Cancel</button>
            <button className="tb-btn primary" onClick={startRun} disabled={busy}>
              <i className={`ti ${busy ? "ti-loader-2" : "ti-player-play"}`} /> {busy ? "Running…" : "Start Test Run"}
            </button>
          </div>
        </div>
      )}

      <div className="ia" style={{ marginTop: 16 }}>
        {error && !showRun && <span style={{ fontSize: 11, color: "var(--red-text)", marginRight: "auto" }}>{error}</span>}
        <button className="tb-btn primary" onClick={() => { setShowRun(true); setTimeout(() => runRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60); }}>
          <i className="ti ti-player-play" /> {hasResults ? "Re-run tests" : "Run tests"}
        </button>
      </div>

      {/* ADD CUSTOM TEST MODAL */}
      {modal && (
        <AddCustomTestModal
          models={models}
          onClose={() => setModal(false)}
          onAdd={async (c) => {
            setModal(false);
            try {
              const res = await fetch("/api/test/custom", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId, name: c.name, description: c.desc, ai_model: c.model, scope: c.scope }),
              });
              const d = await res.json();
              if (res.ok && d.test) {
                setCustom((x) => [{ id: d.test.id, name: d.test.name, desc: d.test.description, model: d.test.ai_model, scope: d.test.scope }, ...x]);
                return;
              }
            } catch {
              /* fall through to client-only */
            }
            setCustom((x) => [{ ...c, id: `${Date.now()}` }, ...x]);
          }}
        />
      )}
    </div>
  );
}

function MethodDetail({
  method, assign, models, dotColor, onOverride,
}: {
  method: TestingMethodDef;
  assign: ModelAssignments;
  models: ModelLite[];
  dotColor: (id: string) => string;
  onOverride: (id: string) => void;
}) {
  const current = assign.method_overrides?.[method.value] || (assign[method.step as keyof ModelAssignments] as string);
  return (
    <div className="method-detail vis">
      <div className="md-top">
        <div className="md-icon-b"><i className={`ti ${method.icon}`} /></div>
        <div className="md-main">
          <div className="md-title">{method.title}</div>
          <div className="md-sub">{method.desc}</div>
          <div className="md-weight">Score weight: <b>×{method.weight}</b> in composite UX Score · {method.category}</div>
        </div>
        <div className="md-modelpick">
          <div className="md-modelpick-lbl">Primary model</div>
          <div className="md-model-tag">
            <span className="model-dot" style={{ background: dotColor(current) }} />
            <select value={current} onChange={(e) => onOverride(e.target.value)}>
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}{!m.available ? " (needs key)" : ""}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="md-calc">
        <div className="mdc-lbl"><i className="ti ti-calculator" /> Calculation formula</div>
        <pre className="mdc-f">{method.formula}</pre>
        <div className="mdc-steps">
          {method.steps.map((s, i) => (
            <div key={i} className="mdc-s"><div className="mdc-sn">{i + 1}</div><div><strong>{s.t}:</strong> {s.d}</div></div>
          ))}
        </div>
      </div>
      <div className="md-outputs">
        {method.outputs.map((o) => <div key={o} className="md-out"><div className="mdo-flbl">Output field</div><div className="mdo-fval">{o}</div></div>)}
      </div>
    </div>
  );
}

function StepGuide({ method, model, dotColor }: { method: TestingMethodDef | null; model: string; dotColor: (id: string) => string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!method) {
    return (
      <div className="sg">
        <div className="sg-body"><div className="sg-empty">Select a testing method above to see how the AI evaluates each persona step by step.</div></div>
      </div>
    );
  }
  return (
    <div className="sg">
      <div className="sg-hd">
        <div className="sg-hd-left"><i className="ti ti-list-check" /><div className="sg-hd-t">{method.title} — step guide</div></div>
        <div className="sg-hd-sub">click a step to expand</div>
      </div>
      <div className="sg-body">
        {method.steps.map((s, i) => (
          <div key={i} className={`gs ${open === i ? "exp" : ""}`} onClick={() => setOpen(open === i ? null : i)}>
            <div className="gs-left">
              <div className="gs-num gsn-todo">{i + 1}</div>
              {i < method.steps.length - 1 && <div className="gs-line" />}
            </div>
            <div className="gs-content">
              <div className="gs-t">{s.t}</div>
              <div className="gs-s">{s.d}</div>
              <div className="gs-detail">
                <strong>How the AI processes this:</strong><br />{s.d}
                <div className="gs-mb"><span className="model-dot" style={{ background: dotColor(model), width: 5, height: 5 }} /> {model}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddCustomTestModal({
  models, onClose, onAdd,
}: {
  models: ModelLite[];
  onClose: () => void;
  onAdd: (c: { name: string; desc: string; model: string; scope: string }) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [model, setModel] = useState("claude-sonnet-4");
  const [scope, setScope] = useState("All personas");
  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="mhd"><div className="mhd-t">Add custom test</div><i className="ti ti-x mhd-close" onClick={onClose} /></div>
        <div className="mbody">
          <div className="mfg"><label className="mfl">Test name</label><input className="input" placeholder="e.g. Brand consistency check" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="mfg"><label className="mfl">Evaluation criteria <small>(be specific)</small></label><textarea className="input" style={{ minHeight: 70, resize: "vertical" }} placeholder="e.g. Check whether elements follow the IBM Carbon Design System spacing, colour, and typography tokens…" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="mfrow">
            <div className="mfg"><label className="mfl">AI model</label>
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                {(models.length ? models : [{ id: "claude-sonnet-4", name: "claude-sonnet-4", available: true } as ModelLite]).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="mfg"><label className="mfl">Applies to</label>
              <select className="input" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option>All personas</option><option>Power users only</option><option>Accessibility profiles</option><option>New users only</option><option>Senior users (45+)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mft-footer">
          <button className="tb-btn" onClick={onClose}>Cancel</button>
          <button className="tb-btn primary" onClick={() => name.trim() && onAdd({ name: name.trim(), desc: desc.trim() || "Custom evaluation", model, scope })}><i className="ti ti-plus" /> Add test</button>
        </div>
      </div>
    </div>
  );
}
