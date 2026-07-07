/**
 * Extracts a JSON array from a model's text response.
 *
 * LLMs occasionally wrap JSON in markdown code fences or add stray prose.
 * This strips common wrappers and parses the first array found.
 */
export function extractJsonArray(text: string): unknown[] {
  let cleaned = text.trim();

  // Remove ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  // Fall back to slicing from the first '[' to the last ']'.
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.slice(start, end + 1);
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Model response was not a JSON array.");
  }
  return parsed;
}
