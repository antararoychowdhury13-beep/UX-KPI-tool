// Flow-context analysis types (spec v2 §6, Prompt 0). The result drives persona-builder config.

export interface FlowContext {
  flow_summary: string;
  user_environment?: string;
  primary_user_archetype?: string;
  recommended_role_levels?: string[];
  recommended_tech_comfort?: string[];
  recommended_age_ranges?: string[];
  recommended_behavioral_traits?: string[];
  accessibility_considerations?: string;
  key_tensions?: string[];
  persona_diversity_note?: string;
}
