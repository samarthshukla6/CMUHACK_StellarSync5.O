import { it, expect } from "vitest";
import { quoteTravelerStorage } from "../src/traveler/quoteTravelerStorage.js";
import {
  draft,
  bag,
  watch,
  session,
  now,
  confirmation,
} from "./travelerHelpers.js";
import { fixture } from "./helpers.js";
const declared = {
  kind: "contents" as const,
  name: "Assorted clothing",
  category: "clothing",
  brand: null,
  model: null,
  quantity: 1,
  condition: "good" as const,
  declaredUnitValue: 100,
};
it("confirmed backpack gets session quote without policy issuance", async () => {
  const d = await draft();
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q).toMatchObject({
    status: "demo_quote_ready",
    policyIssued: false,
    coverage: { limit: 50, deductible: 0 },
    premium: { type: "demo_only", totalPremium: 1.49, durationMinutes: 360 },
  });
  expect(q.premium).not.toHaveProperty("monthlyPremium");
});
it("removes clothing worn in a backpack photo", async () => {
  const d = await draft([
    bag(),
    {
      ...bag(),
      name: "Plaid shirt",
      category: "clothing",
      replacementValue: { low: 20, expected: 40, high: 70 },
    },
  ]);
  const c = confirmation(d);
  c.decisions[1] = { itemId: "item_002", include: false };
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q.items).toHaveLength(1);
  expect(q.valuation.expected).toBe(50);
});
it.each(["missing", "duplicate", "unknown"])(
  "rejects %s decision",
  async (kind) => {
    const d = await draft([bag(), bag()]);
    const c = confirmation(d);
    if (kind === "missing") c.decisions.pop();
    if (kind === "duplicate") c.decisions[1] = c.decisions[0]!;
    if (kind === "unknown")
      c.decisions[0] = { itemId: "item_999", include: false };
    expect(() =>
      quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
    ).toThrowError(
      expect.objectContaining({ code: "INCOMPLETE_CONFIRMATION" }),
    );
  },
);
it("requires explicit attestations", async () => {
  const d = await draft();
  const c = confirmation(d);
  c.attestations.inventoryConfirmed = false as never;
  expect(() =>
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
  ).toThrow();
});
it("cannot confirm zero belongings", async () => {
  const d = await draft();
  const c = confirmation(d);
  c.decisions = [{ itemId: "item_001", include: false }];
  expect(() =>
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
  ).toThrowError(expect.objectContaining({ code: "NO_SELECTED_ITEMS" }));
});
it("manual hidden contents are separately labeled", async () => {
  const d = await draft([bag()], { photoCoverage: "bag_exterior_only" });
  const c = confirmation(d);
  c.manualItems = [declared];
  c.attestations.contentsDeclaration = "all_contents_listed";
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q.valuation.expected).toBe(150);
  expect(q.items[1]).toMatchObject({
    source: "manual",
    priceSource: "user_declared",
    identificationConfidence: null,
    visibleEvidence: [],
    kind: "contents",
  });
  expect(q.status).toBe("demo_quote_ready");
});
it("hidden laptop needs value verification", async () => {
  const d = await draft();
  const c = confirmation(d);
  c.manualItems = [
    {
      ...declared,
      name: "Laptop",
      category: "electronics",
      declaredUnitValue: 900,
    },
  ];
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q.status).toBe("requires_review");
  expect(q.premium).toBeNull();
  expect(q.valuation.pendingReviewExpectedValue).toBe(900);
  expect(q.items[1]?.reviewReasons).toContain("unverified_user_declared_value");
});
it("bag-only scope rejects contents", async () => {
  const d = await draft([bag()], { coverageScope: "bag_only" });
  const c = confirmation(d);
  c.manualItems = [declared];
  expect(() =>
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
  ).toThrow();
});
it("exterior photo cannot be reclassified as observed contents", async () => {
  const d = await draft([bag()], { photoCoverage: "bag_exterior_only" });
  const c = confirmation(d);
  c.decisions = [{ itemId: "item_001", include: true, kind: "contents" }];
  expect(() =>
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
  ).toThrow();
});
it.each(["no_contents", "all_contents_listed"])(
  "contents declaration must agree: %s",
  async (declaration) => {
    const d = await draft();
    const c = confirmation(d);
    c.attestations.contentsDeclaration = declaration as
      "no_contents" | "all_contents_listed";
    if (declaration === "no_contents") c.manualItems = [declared];
    expect(() =>
      quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
    ).toThrow();
  },
);
it("cheap confidently identified Casio is no longer blocked", async () => {
  const d = await draft([watch()]);
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.status).toBe("demo_quote_ready");
  expect(q.items[0]?.reviewReasons).toEqual([]);
});
it.each([
  { confidence: 0.79 },
  { valuationBasis: "category_estimate" as const },
  { brand: null },
  { replacementValue: { low: 100, expected: 250, high: 300 } },
  { replacementValue: { low: 100, expected: 200, high: 500 } },
  { brand: "Rolex" },
  {
    suggestedNeedsReview: true,
    suggestedReviewReason: "Authenticity uncertain",
  },
])("watch exception has guardrails %#", async (patch) => {
  const d = await draft([{ ...watch(), ...patch }]);
  expect(
    quoteTravelerStorage({ draft: d, confirmation: confirmation(d) }, { now })
      .status,
  ).toBe("requires_review");
});
it("uncertain expensive watch still blocks premium", async () => {
  const d = await draft(fixture("uncertain-watch").items);
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.premium).toBeNull();
  expect(q.items[0]?.reviewReasons).toContain("broad_valuation_range");
});
it("correction loses AI confidence and cannot clear an existing review", async () => {
  const d = await draft(fixture("uncertain-watch").items);
  const c = confirmation(d);
  c.decisions = [
    {
      itemId: "item_001",
      include: true,
      kind: "contents",
      correction: {
        ...declared,
        name: "Cheap watch",
        category: "watch",
        declaredUnitValue: 10,
      },
    },
  ];
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q.items[0]).toMatchObject({
    source: "corrected",
    identificationConfidence: null,
    priceSource: "user_declared",
  });
  expect(q.status).toBe("requires_review");
});
it("quantity correction updates totals and triggers review threshold", async () => {
  const d = await draft([
    { ...bag(), replacementValue: { low: 300, expected: 500, high: 600 } },
  ]);
  const c = confirmation(d);
  c.decisions = [
    { itemId: "item_001", include: true, kind: "bag", quantity: 2 },
  ];
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q.valuation.expected).toBe(1000);
  expect(q.items[0]?.reviewReasons).toContain("high_value_item");
});
it.each([
  ["unattended", "ineligible"],
  ["unknown", "requires_review"],
  ["private_host", "requires_review"],
  ["secured_locker", "demo_quote_ready"],
])("storage %s => %s", async (type, status) => {
  const d = await draft([bag()], {
    session: {
      ...session,
      storage: {
        ...session.storage,
        type: type as typeof session.storage.type,
      },
    },
  });
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.status).toBe(status);
  if (status !== "demo_quote_ready") expect(q.premium).toBeNull();
});
it("excluded cash does not inflate coverage or prevent ordinary bag quote", async () => {
  const d = await draft();
  const c = confirmation(d);
  c.manualItems = [
    { ...declared, name: "Cash", category: "currency", declaredUnitValue: 500 },
  ];
  const q = quoteTravelerStorage({ draft: d, confirmation: c }, { now });
  expect(q).toMatchObject({
    status: "demo_quote_ready",
    valuation: { expected: 550, excludedExpectedValue: 500 },
    coverage: { limit: 50 },
  });
  expect(q.items[1]?.eligibility).toBe("excluded");
});
it("only excluded belongings are ineligible", async () => {
  const d = await draft([
    { ...bag(), name: "Passport", category: "travel documents" },
  ]);
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.status).toBe("ineligible");
  expect(q.premium).toBeNull();
});
it("aggregate cap and underinsurance are explicit", async () => {
  const d = await draft(
    Array.from({ length: 7 }, (_, i) => ({
      ...bag(),
      name: `Bag ${i}`,
      replacementValue: { low: 800, expected: 900, high: 950 },
    })),
  );
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.valuation.expected).toBe(6300);
  expect(q.coverage).toMatchObject({
    limit: 5000,
    aggregateLimitReduction: 1300,
    uncoveredEligibleValue: 1300,
  });
  expect(q.warnings).toContain("coverage_below_eligible_estimated_value");
});
it("lower requested limit shows shortfall", async () => {
  const d = await draft([
    { ...bag(), replacementValue: { low: 100, expected: 150, high: 200 } },
  ]);
  const c = confirmation(d);
  c.requestedCoverageLimit = 50;
  expect(
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }).coverage
      .uncoveredEligibleValue,
  ).toBe(100);
});
it("cannot request overinsurance", async () => {
  const d = await draft();
  const c = confirmation(d);
  c.requestedCoverageLimit = 100;
  expect(() =>
    quoteTravelerStorage({ draft: d, confirmation: c }, { now }),
  ).toThrow();
});
it("expired draft rejected by the domain API", async () => {
  const d = await draft();
  expect(() =>
    quoteTravelerStorage(
      { draft: d, confirmation: confirmation(d) },
      { now: () => new Date("2030-01-01T08:31:00Z") },
    ),
  ).toThrowError(expect.objectContaining({ code: "EXPIRED_DRAFT" }));
});
it("zero value gets no payable quote", async () => {
  const d = await draft([
    { ...bag(), replacementValue: { low: 0, expected: 0, high: 0 } },
  ]);
  const q = quoteTravelerStorage(
    { draft: d, confirmation: confirmation(d) },
    { now },
  );
  expect(q.status).toBe("ineligible");
  expect(q.premium).toBeNull();
});
it("rejects invented pricing inputs", async () => {
  const d = await draft();
  expect(() =>
    quoteTravelerStorage(
      {
        draft: d,
        confirmation: { ...confirmation(d), riskMultiplier: 0.1 } as never,
      },
      { now },
    ),
  ).toThrow();
});
