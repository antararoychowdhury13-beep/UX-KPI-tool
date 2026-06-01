// Domain types for users, projects, screenshots, and analyses.
// Mirrors the database schema (spec §3). Used across API routes, workers, and UI.

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  quota_analyses: number;
  quota_used: number;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export type FlowType =
  | "onboarding"
  | "dashboard"
  | "settings"
  | "form"
  | "navigation"
  | "checkout"
  | "custom";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  flow_type: FlowType | string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ScreenshotType = "before" | "after";

export interface Screenshot {
  id: string;
  project_id: string;
  type: ScreenshotType;
  sequence_order: number;
  file_name: string;
  file_path: string;
  screen_label: string | null;
  uploaded_at: string;
}

export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

export interface FlowChange {
  screen_sequence: number;
  change_type:
    | "removed_step"
    | "simplified"
    | "reorganized"
    | "new_feature"
    | "error_handling";
  description: string;
  ux_impact: string;
}

export interface FlowDiff {
  total_steps_before: number;
  total_steps_after: number;
  key_changes: FlowChange[];
  friction_points_removed: string[];
  new_capabilities_added: string[];
}

export interface Analysis {
  id: string;
  project_id: string;
  status: AnalysisStatus;
  before_summary: string | null;
  after_summary: string | null;
  flow_diff: FlowDiff | null;
  raw_gemini_response: unknown | null;
  raw_claude_response: unknown | null;
  processing_time_ms: number | null;
  created_at: string;
}
