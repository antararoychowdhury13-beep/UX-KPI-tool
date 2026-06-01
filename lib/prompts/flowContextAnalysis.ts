// Prompt 0 — Flow Context Analysis (Claude). Spec v2 §6.
// Reads a product flow description and returns a structured context summary used to pre-configure
// AI persona generation (recommended demographics, traits, tech comfort, key tensions).

export function flowContextAnalysisPrompt(params: {
  flowDescription: string;
  flowType: string;
  industry: string;
}): string {
  return `You are a senior UX strategist specializing in enterprise software.
Analyse this product flow description and return a structured context summary to configure AI persona generation.

Flow description: ${params.flowDescription}
Flow type: ${params.flowType}
Industry: ${params.industry}

Return JSON only:
{
  "flow_summary": "One-paragraph summary of what this flow does and who uses it",
  "user_environment": "Where and how users typically perform this flow",
  "primary_user_archetype": "The dominant user type for this flow",
  "recommended_role_levels": ["junior|mid|senior|lead|manager|director"],
  "recommended_tech_comfort": ["beginner|intermediate|advanced|expert"],
  "recommended_age_ranges": ["26-35", "36-45", "46-55"],
  "recommended_behavioral_traits": ["Risk-averse", "Detail-oriented", "Power user"],
  "accessibility_considerations": "Accessibility factors relevant to this user base",
  "key_tensions": ["Tension or change-management risk #1", "Tension #2"],
  "persona_diversity_note": "Guidance on how to keep the generated personas meaningfully distinct"
}`;
}
