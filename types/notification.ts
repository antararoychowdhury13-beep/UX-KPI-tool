// In-app notifications (spec v2 §3). Named AppNotification to avoid the DOM Notification clash.
export type NotificationType =
  | "analysis_complete"
  | "testing_complete"
  | "kpi_ready"
  | "report_ready"
  | "quota_warning"
  | "error";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  project_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  analysis_complete: "ti-photo-check",
  testing_complete: "ti-test-pipe",
  kpi_ready: "ti-chart-bar",
  report_ready: "ti-file-analytics",
  quota_warning: "ti-alert-triangle",
  error: "ti-alert-circle",
};
