import type {
  ModelInventoryItem,
  StorageInventoryItem,
} from "../domain/types.js";
import { reviewReasons } from "./reviewRules.js";
export function postProcessInventory(
  items: ModelInventoryItem[],
  categories?: readonly string[],
): StorageInventoryItem[] {
  return items.map(
    ({ suggestedNeedsReview, suggestedReviewReason, ...item }, index) => {
      const reasons = reviewReasons(
        { ...item, suggestedNeedsReview, suggestedReviewReason },
        categories,
      );
      return {
        ...item,
        id: `item_${String(index + 1).padStart(3, "0")}`,
        priceSource: "model_estimate",
        needsReview: reasons.length > 0,
        reviewReasons: reasons,
      };
    },
  );
}
