// Shows which AI model powers a generation (or "mock" when none is configured). Pure markup —
// usable from server or client components. Pass the result of activeModelInfo().
export function ModelBadge({ model }: { model: { label: string; model: string } | null }) {
  return (
    <span className="model-badge" title={model ? `${model.label} · ${model.model}` : "No AI provider configured — using deterministic mock output"}>
      <i className="ti ti-cpu" />
      {model ? (
        <>
          <span className="mb-label">{model.label}</span>
          <span className="mb-model">{model.model}</span>
        </>
      ) : (
        <span className="mb-label">Mock mode</span>
      )}
    </span>
  );
}
