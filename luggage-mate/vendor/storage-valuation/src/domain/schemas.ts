import { z } from "zod";
import { StorageAnalysisError } from "./errors.js";
export const ReplacementValueSchema = z
  .object({
    low: z.number().min(0).max(1e9),
    expected: z.number().min(0).max(1e9),
    high: z.number().min(0).max(1e9),
  })
  .strict()
  .refine(
    (value) => value.expected >= value.low && value.high >= value.expected,
    { message: "Replacement values must satisfy low <= expected <= high." },
  );
export const ModelInventoryItemSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(200),
    brand: z.string().max(200).nullable(),
    model: z.string().max(200).nullable(),
    quantity: z.number().int().min(1).max(100000),
    condition: z.enum(["new", "like_new", "good", "fair", "poor", "unknown"]),
    confidence: z.number().min(0).max(1),
    replacementValue: ReplacementValueSchema,
    valuationBasis: z.enum([
      "exact_model",
      "probable_model",
      "brand_family",
      "category_estimate",
    ]),
    visibleEvidence: z.array(z.string().max(1000)).max(30),
    suggestedNeedsReview: z.boolean(),
    suggestedReviewReason: z.string().max(2000).nullable(),
  })
  .strict();
export const ModelInventoryResponseSchema = z
  .object({ items: z.array(ModelInventoryItemSchema).max(500) })
  .strict();
export const modelResponseJsonSchema = z.toJSONSchema(
  ModelInventoryResponseSchema,
);
export function validateModelResponse(value: unknown) {
  const parsed = ModelInventoryResponseSchema.safeParse(value);
  if (!parsed.success)
    throw new StorageAnalysisError(
      "INVALID_AI_RESPONSE",
      "The inventory response did not match the required schema.",
      { cause: parsed.error },
    );
  if (!parsed.data.items.length)
    throw new StorageAnalysisError(
      "EMPTY_AI_RESPONSE",
      "No identifiable belongings were returned. Try clearer photographs.",
    );
  return parsed.data;
}
