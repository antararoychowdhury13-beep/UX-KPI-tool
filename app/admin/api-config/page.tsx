import { listAIServices } from "@/lib/db";
import { ServiceManager } from "@/components/admin/ServiceManager";

export default function AdminApiConfigPage() {
  // A service is "live" when its configured env var is present; otherwise the mock is used.
  const services = listAIServices().map((s) => ({
    ...s,
    live: !!(s.env_var && process.env[s.env_var]),
  }));

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">AI services</div>
          <div className="section-sub">Add, edit, enable/disable, or remove AI services</div>
        </div>
      </div>

      <div className="hint">
        <i className="ti ti-info-circle" />
        <div>
          A service shows <strong>live</strong> when its API key env var is set, otherwise a
          deterministic <strong>mock</strong> is used. Disabling a service stops new calls from
          using it. Built-in services power the core pipeline; custom ones can be added for new
          providers/models.
        </div>
      </div>

      <ServiceManager initial={services} />
    </>
  );
}
