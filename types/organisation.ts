// Organisation / team (spec v2 §3).
export type OrgPlan = "free" | "pro" | "enterprise";

export interface Organisation {
  id: string;
  name: string;
  slug: string | null;
  plan: OrgPlan;
  quota_analyses_per_month: number;
  quota_users_max: number;
  created_at: string;
}
