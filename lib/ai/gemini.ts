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
  /** Set on every return path; absent only on legacy records. */
  provenance?: AnalysisProvenance;
}

/** Where an analysis actually came from. Never let a failure look like a success. */
export interface AnalysisProvenance {
  /** live = a provider read the pixels; mock = canned demo output; failed = provider errored. */
  status: "live" | "mock" | "failed";
  provider: string | null;
  model: string | null;
  pixels_read: boolean;
  reason?: string;
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
  const allImages = [...params.beforeImages, ...params.afterImages];
  const hasRealBytes = allImages.some((img) => img.data && img.data.length > 0);
  const MODEL = "gemini-1.5-flash";

  // Every non-live path states WHY, so the UI can never present canned output as analysis.
  if (!hasGemini) {
    return mockAnalysis(params.beforeImages.length, params.afterImages.length, {
      status: "mock", provider: null, model: null, pixels_read: false,
      reason: "No GOOGLE_GEMINI_API_KEY configured — screens were not inspected.",
    });
  }
  if (!isServiceEnabled("gemini")) {
    return mockAnalysis(params.beforeImages.length, params.afterImages.length, {
      status: "mock", provider: "google", model: MODEL, pixels_read: false,
      reason: "Gemini is disabled in Admin → AI services — screens were not inspected.",
    });
  }
  if (!hasRealBytes) {
    return mockAnalysis(params.beforeImages.length, params.afterImages.length, {
      status: "mock", provider: "google", model: MODEL, pixels_read: false,
      reason: "No screenshot bytes were available to send — screens were not inspected.",
    });
  }

  try {
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
    const parsed = extractJson<ScreenAnalysisRaw>(result.response.text());
    return {
      ...parsed,
      provenance: { status: "live", provider: "google", model: MODEL, pixels_read: true },
    };
  } catch (e) {
    // A provider failure must NOT look like a successful analysis: the canned content
    // still renders so the pipeline continues, but it is flagged `failed` with the cause.
    return mockAnalysis(params.beforeImages.length, params.afterImages.length, {
      status: "failed", provider: "google", model: MODEL, pixels_read: false,
      reason: `Vision provider call failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
}

function mockAnalysis(
  beforeCount: number,
  afterCount: number,
  provenance: AnalysisProvenance,
): ScreenAnalysisRaw {
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
    provenance,
  };
}
