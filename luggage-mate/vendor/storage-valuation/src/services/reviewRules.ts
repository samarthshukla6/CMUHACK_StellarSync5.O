import { DEFAULT_SENSITIVE_CATEGORIES } from "../domain/categories.js";
import type { ModelInventoryItem } from "../domain/types.js";
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
export function reviewReasons(
  item: ModelInventoryItem,
  sensitiveCategories: readonly string[] = DEFAULT_SENSITIVE_CATEGORIES,
): string[] {
  const reasons: string[] = [];
  const expectedTotal = item.quantity * item.replacementValue.expected;
  if (item.confidence < 0.6) reasons.push("low_identification_confidence");
  if (expectedTotal >= 1000) reasons.push("high_value_item");
  if (
    expectedTotal >= 200 &&
    item.replacementValue.high / Math.max(item.replacementValue.low, 1) > 2.5
  )
    reasons.push("broad_valuation_range");
  const category = ` ${normalize(item.category)} `;
  if (
    sensitiveCategories.some(
      (word) => normalize(word) && category.includes(` ${normalize(word)} `),
    )
  )
    reasons.push("verification_sensitive_category");
  if (item.suggestedNeedsReview) {
    reasons.push("model_suggested_review");
    if (item.suggestedReviewReason?.trim())
      reasons.push(item.suggestedReviewReason.trim());
  }
  return [...new Set(reasons)];
}
