// Prompt 4 — KPI Matrix Generation (Claude). Spec §5.

export function kpiInferencePrompt(params: {
  analysisJson: string;
  testResultsJson: string;
  personasJson: string;
  industryContext: string;
}): string {
  return `You are a UX metrics expert. Based on the design analysis and synthetic test results, generate a KPI matrix.
Flow analysis: ${params.analysisJson}
Synthetic test results: ${params.testResultsJson}
Personas tested: ${params.personasJson}
Industry context: ${params.industryContext}

Return JSON only:
{
  "overall_confidence": float,
  "kpis": [
    {
      "name": "...",
      "category": "efficiency|satisfaction|accessibility|error_reduction|learnability",
      "before_score": number (0-100),
      "after_score": number (0-100),
      "delta": number,
      "delta_direction": "improvement|regression|neutral",
      "confidence_level": "low|medium|high",
      "confidence_score": float,
      "reasoning": "...",
      "measurement_method": "...",
      "ux_principle": "...",
      "persona_impact": ["personaNames"]
    }
  ],
  "top_3_improvements": ["..."],
  "risks_and_regressions": ["..."],
  "post_launch_tracking_plan": "..."
}
Generate at least 5 KPIs across multiple categories.`;
}
