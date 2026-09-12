import { it, expect } from "vitest";
import { calculatePremium } from "../src/services/premiumCalculator.js";
it.each([
  [1050, 1, 3.15],
  [400, 1, 2.99],
  [0, 1, 0],
  [1000, 2, 6],
])("premium %s x %s", (value, risk, premium) =>
  expect(calculatePremium(value, risk).monthlyPremium).toBe(premium),
);
it.each([0, -1, NaN, Infinity, 0.24, 5.01])("invalid risk %s", (risk) =>
  expect(() => calculatePremium(500, risk)).toThrowError(
    expect.objectContaining({ code: "INVALID_RISK_MULTIPLIER" }),
  ),
);
