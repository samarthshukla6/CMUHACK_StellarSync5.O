import { it, expect } from "vitest";
import { validateModelResponse } from "../src/domain/schemas.js";
import { baseItem } from "./helpers.js";
it.each([null, "bad", {}, { items: "bad" }, { items: [{}] }])(
  "malformed response %#",
  (value) =>
    expect(() => validateModelResponse(value)).toThrowError(
      expect.objectContaining({ code: "INVALID_AI_RESPONSE" }),
    ),
);
it.each([
  { replacementValue: { low: 300, expected: 200, high: 400 } },
  { replacementValue: { low: 100, expected: 300, high: 200 } },
  { confidence: 1.1 },
  { confidence: -0.1 },
  { quantity: 0 },
  { quantity: 1.5 },
  { condition: "excellent" },
  { replacementValue: { low: 0, expected: Infinity, high: Infinity } },
])("invalid item %#", (patch) =>
  expect(() =>
    validateModelResponse({ items: [{ ...baseItem(), ...patch }] }),
  ).toThrowError(expect.objectContaining({ code: "INVALID_AI_RESPONSE" })),
);
it("empty inventory is controlled error", () =>
  expect(() => validateModelResponse({ items: [] })).toThrowError(
    expect.objectContaining({ code: "EMPTY_AI_RESPONSE" }),
  ));
it("rejects model totals", () =>
  expect(() =>
    validateModelResponse({ items: [baseItem()], total: 100 }),
  ).toThrow());
