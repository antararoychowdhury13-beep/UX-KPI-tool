// Audit log entry (spec v2 §3).
export interface AuditEntry {
  id: string;
  org_id: string | null;
  user_id: string | null;
  action: string; // e.g. "project.created" | "persona.generated" | "report.created"
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
