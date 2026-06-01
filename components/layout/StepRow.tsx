// Wizard progress indicator (mockup .step-row). Pure presentational.
const STEPS = [
  { key: "setup", label: "Setup" },
  { key: "upload", label: "Upload" },
  { key: "personas", label: "Personas" },
  { key: "testing", label: "Test" },
  { key: "kpi", label: "KPI" },
  { key: "report", label: "Report" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function StepRow({ current }: { current: StepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="step-row">
      {STEPS.map((step, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "curr" : "todo";
        // The step that just finished (immediately before the current one) gets a one-shot
        // check-in animation; the line leading into the current step sweeps to filled.
        const justDone = i === currentIdx - 1;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <div className="step-item">
              <div className={`step-dot ${state === "done" ? "sd-done" : state === "curr" ? "sd-curr" : "sd-todo"} ${justDone ? "sd-pop" : ""}`}>
                {state === "done" ? <i className="ti ti-check" style={{ fontSize: 12 }} /> : i + 1}
              </div>
              <div className={`step-lbl ${state === "curr" ? "curr" : ""}`}>{step.label}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`step-line ${i < currentIdx ? "done" : ""} ${justDone ? "anim" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
