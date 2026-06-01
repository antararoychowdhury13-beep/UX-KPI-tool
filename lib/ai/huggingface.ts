// HuggingFace fallback — image embeddings / similarity scoring (spec §2).
// Stubbed for the MVP; returns a deterministic similarity score in mock mode.
import { hasHuggingFace } from "@/lib/config";

/** Cosine-style similarity in [0,1] between a before/after screen pair. */
export async function imageSimilarity(
  _beforeBase64: string,
  _afterBase64: string,
): Promise<number> {
  if (!hasHuggingFace) {
    // Deterministic placeholder — real embeddings wired in a later milestone.
    return 0.42;
  }
  // TODO: call HuggingFace feature-extraction inference and compute cosine similarity.
  return 0.42;
}
