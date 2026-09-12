import { it, expect } from "vitest";
import { aggregateValuation } from "../src/services/valuation.js";
import { baseItem, fixture } from "./helpers.js";
it("multiplies quantities", () =>
  expect(aggregateValuation([{ ...baseItem(), quantity: 2 }])).toEqual({
    low: 240,
    expected: 400,
    high: 600,
    recommendedInsuredValue: 400,
  }));
it("combines items", () =>
  expect(aggregateValuation(fixture().items)).toEqual({
    low: 190,
    expected: 310,
    high: 460,
    recommendedInsuredValue: 350,
  }));
it.each([
  [1020, 1050],
  [370, 400],
  [2351, 2400],
  [0, 0],
  [50, 50],
])("rounds coverage %s", (expected, insured) =>
  expect(
    aggregateValuation([
      {
        ...baseItem(),
        replacementValue: { low: expected, expected, high: expected },
      },
    ]).recommendedInsuredValue,
  ).toBe(insured),
);
it("rounds monetary totals", () =>
  expect(
    aggregateValuation([
      {
        ...baseItem(),
        quantity: 3,
        replacementValue: { low: 0.1, expected: 0.1, high: 0.1 },
      },
    ]).expected,
  ).toBe(0.3));
it("zero inventory aggregation", () =>
  expect(aggregateValuation([]).recommendedInsuredValue).toBe(0));
