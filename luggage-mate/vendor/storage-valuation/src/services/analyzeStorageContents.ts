import { extractStorageInventory } from "./extractStorageInventory.js";
import type {
  AnalyzeStorageContentsInput,
  StorageValuationResult,
} from "../domain/types.js";
import type { InventoryVisionProvider } from "../providers/InventoryVisionProvider.js";
import { postProcessInventory } from "./postProcessInventory.js";
import { aggregateValuation } from "./valuation.js";
import {
  calculatePremium,
  validateRiskMultiplier,
} from "./premiumCalculator.js";
export interface AnalyzeStorageContentsDependencies {
  provider?: InventoryVisionProvider;
  maxImageBytes?: number;
  sensitiveCategories?: readonly string[];
  now?: () => Date;
}
export async function analyzeStorageContents(
  input: AnalyzeStorageContentsInput,
  dependencies: AnalyzeStorageContentsDependencies = {},
): Promise<StorageValuationResult> {
  const riskMultiplier =
    input?.riskMultiplier === undefined ? 1 : input.riskMultiplier;
  validateRiskMultiplier(riskMultiplier);
  const { inventory, imagesAnalyzed, metadata } = await extractStorageInventory(
    input,
    dependencies,
  );
  const items = postProcessInventory(
    inventory.items,
    dependencies.sensitiveCategories,
  );
  const totals = aggregateValuation(items);
  const warnings = ["valuation_uses_model_estimates_not_live_prices"];
  if (items.some((item) => item.needsReview))
    warnings.push("some_items_require_additional_verification");
  if (
    items.some((item) =>
      item.reviewReasons.includes("low_identification_confidence"),
    )
  )
    warnings.push("low_confidence_items_present");
  if (items.some((item) => item.reviewReasons.includes("high_value_item")))
    warnings.push("high_value_items_present");
  return {
    status: items.some((item) => item.needsReview)
      ? "provisional"
      : "auto_quoted",
    currency: "USD",
    imagesAnalyzed,
    items,
    totals,
    premium: calculatePremium(totals.recommendedInsuredValue, riskMultiplier),
    warnings,
    metadata,
  };
}
