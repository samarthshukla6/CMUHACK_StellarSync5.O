import type { ModelInventoryItem } from "../domain/types.js";
import { DEFAULT_SENSITIVE_CATEGORIES } from "../domain/categories.js";
import { reviewReasons } from "../services/reviewRules.js";
export function keywordMatch(
  text: string,
  keywords: readonly string[],
): boolean {
  const normalized = ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
  return keywords.some((word) =>
    normalized.includes(` ${word.replace(/_/g, " ")} `),
  );
}
export function reviewTravelerItem(
  item: ModelInventoryItem,
  userDeclared = false,
): string[] {
  const combined = `${item.category} ${item.name} ${item.brand ?? ""} ${item.model ?? ""}`;
  const isWatch = keywordMatch(combined, [
    "watch",
    "watches",
    "wristwatch",
    "wristwatches",
  ]);
  const luxury = keywordMatch(combined, [
    "rolex",
    "patek",
    "audemars",
    "cartier",
    "omega",
    "luxury",
    "designer",
    "gold",
    "platinum",
    "diamond",
  ]);
  const ordinaryWatch =
    isWatch &&
    !userDeclared &&
    !luxury &&
    item.confidence >= 0.8 &&
    !!item.brand?.trim() &&
    item.valuationBasis !== "category_estimate" &&
    item.quantity * item.replacementValue.expected < 250 &&
    item.quantity * item.replacementValue.high < 500;
  const categories = ordinaryWatch
    ? DEFAULT_SENSITIVE_CATEGORIES.filter(
        (word) => !["watch", "watches"].includes(word),
      )
    : DEFAULT_SENSITIVE_CATEGORIES;
  const reasons = reviewReasons({ ...item, category: combined }, categories);
  if (isWatch && !ordinaryWatch)
    reasons.push("verification_sensitive_category");
  if (
    luxury ||
    keywordMatch(combined, ["musical instrument", "professional equipment"])
  )
    reasons.push("verification_sensitive_category");
  if (userDeclared && item.quantity * item.replacementValue.expected >= 250)
    reasons.push("unverified_user_declared_value");
  return [...new Set(reasons)];
}
export function itemExclusions(name: string, category: string): string[] {
  return keywordMatch(`${name} ${category}`, [
    "cash",
    "currency",
    "gift card",
    "gift cards",
    "passport",
    "passports",
    "travel document",
    "travel documents",
    "perishable",
    "food",
  ])
    ? ["excluded_item_category"]
    : [];
}
