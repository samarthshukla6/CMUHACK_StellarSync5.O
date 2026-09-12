import { describe, it, expect } from "vitest";
import { reviewReasons } from "../src/services/reviewRules.js";
import { baseItem } from "./helpers.js";
describe("review rules", () => {
  it.each([
    [0.59, true],
    [0.6, false],
  ])("confidence %s", (confidence, review) =>
    expect(
      reviewReasons({ ...baseItem(), confidence }).includes(
        "low_identification_confidence",
      ),
    ).toBe(review),
  );
  it.each([
    [1000, 1, true],
    [500, 2, true],
    [999, 1, false],
  ])("value %s quantity %s", (expected, quantity, review) =>
    expect(
      reviewReasons({
        ...baseItem(),
        quantity,
        replacementValue: { low: expected, expected, high: expected },
      }).includes("high_value_item"),
    ).toBe(review),
  );
  it.each([
    [200, 251, true],
    [199, 1000, false],
    [200, 250, false],
  ])("broad range %s %s", (expected, high, review) =>
    expect(
      reviewReasons({
        ...baseItem(),
        replacementValue: { low: 100, expected, high },
      }).includes("broad_valuation_range"),
    ).toBe(review),
  );
  it.each([
    "jewelry",
    "watch",
    "collectible",
    "Fine_Art",
    "luxury goods",
    "antique furniture",
    "JEWELLERY",
  ])("sensitive category %s", (category) =>
    expect(reviewReasons({ ...baseItem(), category })).toContain(
      "verification_sensitive_category",
    ),
  );
  it("ordinary clothing", () => expect(reviewReasons(baseItem())).toEqual([]));
  it("preserves model suggestion", () =>
    expect(
      reviewReasons({
        ...baseItem(),
        suggestedNeedsReview: true,
        suggestedReviewReason: "Close-up needed",
      }),
    ).toEqual(["model_suggested_review", "Close-up needed"]));
  it("deduplicates reasons", () =>
    expect(
      reviewReasons({
        ...baseItem(),
        confidence: 0.3,
        suggestedNeedsReview: true,
        suggestedReviewReason: "low_identification_confidence",
      }),
    ).toEqual(["low_identification_confidence", "model_suggested_review"]));
  it("custom category set", () =>
    expect(reviewReasons(baseItem(), ["clothing"])).toContain(
      "verification_sensitive_category",
    ));
});
