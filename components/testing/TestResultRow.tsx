"use client";

import { useState } from "react";
import { initials, avatarTone } from "@/lib/utils/initials";
import {
  HEURISTIC_LABELS,
  type FrictionPoint,
  type HeuristicScores,
  type Persona,
  type SyntheticTestRaw,
  type SyntheticTestResult,
} from "@/types/persona";

function frictionCounts(points: FrictionPoint[]) {
  return {
    high: points.filter((p) => p.severity === "high").length,
    medium: points.filter((p) => p.severity === "medium").length,
    low: points.filter((p) => p.severity === "low").length,
  };
}

const pct = (n: number) => Math.round(n * 100);
const raw = (r?: SyntheticTestResult) => (r?.raw_ai_response as SyntheticTestRaw | undefined) ?? undefined;

export function TestResultRow({
  persona,
  index,
  before,
  after,
}: {
  persona: Persona;
  index: number;
  before?: SyntheticTestResult;
  after?: SyntheticTestResult;
}) {
  const [open, setOpen] = useState(false);
  const fc = after ? frictionCounts(after.friction_points) : null;
  const beforeRaw = raw(before);
  const afterRaw = raw(after);
  const method = afterRaw?.testing_method ?? beforeRaw?.testing_method ?? "heuristic";
  const hasDetail = !!afterRaw && (
    (method === "heuristic" && !!afterRaw.heuristic_scores) ||
    (method === "task_scenario" && !!afterRaw.task_scenarios_result?.length) ||
    (method === "think_aloud" && !!afterRaw.think_aloud_transcript) ||
    (method === "cognitive_load" && !!afterRaw.cognitive_load_map?.length)
  );

  return (
    <div className="test-row-wrap">
      <div className="test-row">
        <div className={`pa ${avatarTone(index)}`} style={{ width: 32, height: 32, fontSize: 11 }}>
          {initials(persona.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>
            {persona.name} — {persona.occupation || "—"}
          </div>
          {before && after ? (
            <div className="vs-bars">
              <div className="vs-bar-row">
                <div className="vs-bar-lbl">Before</div>
                <div className="vs-bar-track">
                  <div className="vs-bar-fill vb-before" style={{ width: `${pct(before.task_success_rate)}%` }} />
                </div>
                <span className="vs-bar-pct">{pct(before.task_success_rate)}%</span>
              </div>
              <div className="vs-bar-row">
                <div className="vs-bar-lbl">After</div>
                <div className="vs-bar-track">
                  <div className="vs-bar-fill vb-after" style={{ width: `${pct(after.task_success_rate)}%` }} />
                </div>
                <span className="vs-bar-pct" style={{ color: "var(--text)" }}>{pct(after.task_success_rate)}%</span>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "var(--text3)" }}>Not tested yet.</div>
          )}
        </div>

        {fc && (
          <div className="friction-info">
            {fc.high > 0 && <div className="fi-row"><div className="fdot fd-h" />{fc.high} high friction{fc.high > 1 ? "s" : ""}</div>}
            {fc.medium > 0 && <div className="fi-row"><div className="fdot fd-m" />{fc.medium} medium</div>}
            {fc.low > 0 && <div className="fi-row"><div className="fdot fd-l" />{fc.low} low</div>}
            {fc.high + fc.medium + fc.low === 0 && <div className="fi-row"><div className="fdot fd-l" />no frictions</div>}
          </div>
        )}

        {after && (
          <div className="score-col">
            <div className="score-num">{after.overall_score.toFixed(1)}</div>
            <div className="score-lbl">score</div>
          </div>
        )}

        {hasDetail && (
          <button className="expand-btn" onClick={() => setOpen((o) => !o)} type="button" aria-expanded={open}>
            <i className={`ti ti-chevron-${open ? "up" : "down"}`} />
          </button>
        )}
      </div>

      {open && hasDetail && afterRaw && (
        <div className="test-detail">
          {method === "heuristic" && afterRaw.heuristic_scores && (
            <HeuristicGrid before={beforeRaw?.heuristic_scores} after={afterRaw.heuristic_scores} />
          )}
          {method === "task_scenario" && afterRaw.task_scenarios_result && (
            <TaskTable tasks={afterRaw.task_scenarios_result} />
          )}
          {method === "think_aloud" && afterRaw.think_aloud_transcript && (
            <ThinkAloud raw={afterRaw} />
          )}
          {method === "cognitive_load" && afterRaw.cognitive_load_map && (
            <CognitiveLoad before={beforeRaw} after={afterRaw} />
          )}
          {afterRaw.persona_reaction && (
            <div className="detail-reaction">
              <i className="ti ti-quote" /> {afterRaw.persona_reaction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HeuristicGrid({ before, after }: { before?: HeuristicScores; after: HeuristicScores }) {
  const keys = Object.keys(HEURISTIC_LABELS) as (keyof HeuristicScores)[];
  return (
    <div className="detail-block">
      <div className="detail-title">Nielsen's 10 heuristics — after flow{before ? " (before → after)" : ""}</div>
      <div className="heuristic-grid">
        {keys.map((k) => (
          <div key={k} className="heuristic-row">
            <span className="heuristic-name">{HEURISTIC_LABELS[k]}</span>
            <div className="heuristic-track">
              <div className="heuristic-fill" style={{ width: `${(after[k] ?? 0) * 10}%` }} />
            </div>
            <span className="heuristic-val">
              {before ? `${before[k] ?? 0}→` : ""}
              {after[k] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskTable({ tasks }: { tasks: NonNullable<SyntheticTestRaw["task_scenarios_result"]> }) {
  return (
    <div className="detail-block">
      <div className="detail-title">Task scenarios — after flow</div>
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th>Result</th>
            <th>Steps</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t, i) => (
            <tr key={i}>
              <td>{t.task_name}{t.deviation_reason ? <div className="task-note">{t.deviation_reason}</div> : null}</td>
              <td>
                <span className={`badge ${t.success ? "b-done" : "b-fail"}`}>{t.success ? "success" : "failed"}</span>
              </td>
              <td>{t.steps_taken}/{t.expected_steps}</td>
              <td>{t.completion_time_estimate || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ThinkAloud({ raw }: { raw: SyntheticTestRaw }) {
  return (
    <div className="detail-block">
      <div className="detail-title">Think-aloud transcript — after flow</div>
      <p className="transcript">{raw.think_aloud_transcript}</p>
      {raw.key_quotes && raw.key_quotes.length > 0 && (
        <div className="quote-chips">
          {raw.key_quotes.map((q, i) => (
            <span key={i} className="quote-chip">“{q}”</span>
          ))}
        </div>
      )}
    </div>
  );
}

function CognitiveLoad({ before, after }: { before?: SyntheticTestRaw; after: SyntheticTestRaw }) {
  const map = after.cognitive_load_map ?? [];
  return (
    <div className="detail-block">
      <div className="detail-title">
        Cognitive load by screen — after flow
        {typeof after.average_cognitive_load === "number" && (
          <span className="detail-meta">
            avg {before?.average_cognitive_load != null ? `${before.average_cognitive_load.toFixed(1)} → ` : ""}
            {after.average_cognitive_load.toFixed(1)}/10
          </span>
        )}
      </div>
      <div className="cload-list">
        {map.map((c, i) => (
          <div key={i} className="cload-row">
            <span className="cload-lbl">{c.screen_label || `Screen ${c.screen_sequence}`}</span>
            <div className="cload-track">
              <div
                className={`cload-fill ${c.load_score >= 7 ? "cl-high" : c.load_score >= 4 ? "cl-med" : "cl-low"}`}
                style={{ width: `${c.load_score * 10}%` }}
              />
            </div>
            <span className="cload-val">{c.load_score}/10</span>
          </div>
        ))}
      </div>
    </div>
  );
}
