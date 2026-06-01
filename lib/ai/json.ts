// Extract a JSON object/array from an LLM text response that may include prose or code fences.
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in model response");
  // Find the matching final bracket by scanning from the end.
  const end = Math.max(candidate.lastIndexOf("}"), candidate.lastIndexOf("]"));
  const slice = candidate.slice(start, end + 1);
  return JSON.parse(slice) as T;
}
