import { StorageAnalysisError } from "../domain/errors.js";
import type { PrototypePremium } from "../domain/types.js";
import { roundMoney } from "./valuation.js";
export function validateRiskMultiplier(value: number) {
  if (!Number.isFinite(value) || value < 0.25 || value > 5)
    throw new StorageAnalysisError(
      "INVALID_RISK_MULTIPLIER",
      "Risk multiplier must be between 0.25 and 5.",
    );
}
export function calculatePremium(
  insuredValue: number,
  riskMultiplier = 1,
): PrototypePremium {
  validateRiskMultiplier(riskMultiplier);
  roundMoney(insuredValue);
  const baseMonthlyRate = 0.003,
    minimumMonthlyPremium = 2.99;
  return {
    type: "demo_only",
    insuredValue,
    baseMonthlyRate,
    riskMultiplier,
    minimumMonthlyPremium,
    monthlyPremium:
      insuredValue === 0
        ? 0
        : roundMoney(
            Math.max(
              minimumMonthlyPremium,
              insuredValue * baseMonthlyRate * riskMultiplier,
            ),
          ),
  };
}
