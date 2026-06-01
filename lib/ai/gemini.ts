// Gemini Vision wrapper — before/after screenshot analysis (spec §2, §5 Prompt 1).
// Real Google Generative AI call when GOOGLE_GEMINI_API_KEY is set; deterministic mock otherwise.
import { hasGemini } from "@/lib/config";
import { isServiceEnabled } from "@/lib/db";
import { extractJson } from "@/lib/ai/json";
import { screenAnalysisPrompt } from "@/lib/prompts/screenAnalysis";
import type { FlowDiff } from "@/types/project";

const MODEL = "gemini-1.5-flash";

export interface ScreenAnalysisRaw {
  before_flow_summary: string;
  after_flow_summary: string;
  total_steps_before: number;
  total_steps_after: number;
  key_changes: FlowDiff["key_changes"];
  friction_points_removed: string[];
  new_capabilities_added: string[];
}

export interface InlineImage {
  mimeType: string;
  /** base64-encoded image bytes (no data: prefix). */
  data: string;
}

export async function analyzeScreens(params: {
  flowDescription: string;
  flowType: string;
  beforeImages: InlineImage[];
  afterImages: InlineImage[];
}): Promise<ScreenAnalysisRaw> {
  if (!hasGemini || !isServiceEnabled("gemini")) {
    return mockAnalysis(params.beforeImages.length, params.afterImages.length);
  }

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: MODEL });

  const prompt = screenAnalysisPrompt({
    flowDescription: params.flowDescription,
    flowType: params.flowType,
    beforeCount: params.beforeImages.length,
    afterCount: params.afterImages.length,
  });

  const parts = [
    { text: prompt },
    { text: "BEFORE screenshots:" },
    ...params.beforeImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
    { text: "AFTER screenshots:" },
    ...params.afterImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
  ];

  const result = await model.generateContent(parts);
  return extractJson<ScreenAnalysisRaw>(result.response.text());
}

function mockAnalysis(beforeCount: number, afterCount: number): ScreenAnalysisRaw {
  return {
    before_flow_summary:
      "The legacy flow spans several dense screens with multi-field forms and validation deferred to submit.",
    after_flow_summary:
      "The redesigned flow consolidates steps, surfaces required fields inline, and adds a clear progress indicator.",
    total_steps_before: Math.max(beforeCount, 5),
    total_steps_after: Math.max(afterCount, 2),
    key_changes: [
      {
        screen_sequence: 1,
        change_type: "simplified",
        description: "Reduced the entry form from many fields to the essential few.",
        ux_impact: "Lowers cognitive load and perceived effort.",
      },
      {
        screen_sequence: 2,
        change_type: "removed_step",
        description: "Merged two confirmation screens into one.",
        ux_impact: "Shortens the path to task completion.",
      },
      {
        screen_sequence: 3,
        change_type: "error_handling",
        description: "Added inline, real-time validation.",
        ux_impact: "Prevents errors before submission.",
      },
    ],
    friction_points_removed: [
      "Validation only on submit",
      "No progress indication",
      "Redundant confirmation step",
    ],
    new_capabilities_added: ["Inline validation", "Progress indicator"],
  };
}
