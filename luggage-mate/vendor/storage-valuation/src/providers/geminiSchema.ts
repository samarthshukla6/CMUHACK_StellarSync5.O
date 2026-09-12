import { modelResponseJsonSchema } from "../domain/schemas.js";

// Gemini rejected the bounded Zod schema in live testing. Keep structural
// constraints on the wire; the full Zod schema still enforces every local limit.
const localOnlyKeywords = new Set([
  "$schema",
  "minLength",
  "maxLength",
  "maxItems",
  "maximum",
]);
function transportSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(transportSchema);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !localOnlyKeywords.has(key))
        .map(([key, child]) => [key, transportSchema(child)]),
    );
  }
  return value;
}
export const geminiInventoryJsonSchema = transportSchema(
  modelResponseJsonSchema,
) as Record<string, unknown>;
