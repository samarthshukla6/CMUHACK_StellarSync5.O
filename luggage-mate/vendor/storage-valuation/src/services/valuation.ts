import type { ModelInventoryItem, ValuationTotals } from "../domain/types.js";
import { StorageAnalysisError } from "../domain/errors.js";
export function roundMoney(value: number): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > Number.MAX_SAFE_INTEGER / 100
  )
    throw new StorageAnalysisError(
      "INVALID_AI_RESPONSE",
      "The calculated value exceeds the supported monetary range.",
    );
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function aggregateValuation(
  items: Pick<ModelInventoryItem, "quantity" | "replacementValue">[],
): ValuationTotals {
  const sum = (key: "low" | "expected" | "high") =>
    roundMoney(
      items.reduce(
        (total, item) => total + item.quantity * item.replacementValue[key],
        0,
      ),
    );
  const expected = sum("expected");
  return {
    low: sum("low"),
    expected,
    high: sum("high"),
    recommendedInsuredValue: expected === 0 ? 0 : Math.ceil(expected / 50) * 50,
  };
}
