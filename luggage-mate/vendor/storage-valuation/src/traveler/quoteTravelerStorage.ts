import { assessStorageSession } from "./assessStorageSession.js";
import { StorageAnalysisError } from "../domain/errors.js";
import type { ModelInventoryItem } from "../domain/types.js";
import { aggregateValuation, roundMoney } from "../services/valuation.js";
import {
  ConfirmationSchema,
  TravelerDraftSchema,
  parseTraveler,
  type TravelerInventoryDraft,
  type InventoryConfirmation,
  type DeclaredItem,
} from "./schemas.js";
import type { ConfirmedTravelerItem, TravelerSessionQuote } from "./types.js";
import { itemExclusions, reviewTravelerItem } from "./reviewTravelerItem.js";
import {
  calculateSessionPremium,
  TRAVELER_DEMO_TERMS,
} from "./sessionPremium.js";

function declaredModel(item: DeclaredItem): ModelInventoryItem {
  // Declarations have no AI confidence. The internal adapter bypasses the AI
  // confidence rule; declaration-specific rules run separately and output null.
  return {
    name: item.name,
    category: item.category,
    brand: item.brand,
    model: item.model,
    quantity: item.quantity,
    condition: item.condition,
    confidence: 1,
    replacementValue: {
      low: item.declaredUnitValue,
      expected: item.declaredUnitValue,
      high: item.declaredUnitValue,
    },
    valuationBasis: "category_estimate",
    visibleEvidence: [],
    suggestedNeedsReview: false,
    suggestedReviewReason: null,
  };
}
function confirmedItem(
  model: ModelInventoryItem,
  source: "photo" | "manual" | "corrected",
  kind: "bag" | "contents",
  sourceItemId: string | null,
  original?: ModelInventoryItem,
): ConfirmedTravelerItem {
  const declared = source !== "photo";
  const reasons = [
    ...new Set([
      ...reviewTravelerItem(model, declared),
      ...(original ? reviewTravelerItem(original) : []),
    ]),
  ];
  const exclusions = [
    ...new Set([
      ...itemExclusions(model.name, model.category),
      ...(original ? itemExclusions(original.name, original.category) : []),
    ]),
  ];
  const expectedLineValue = roundMoney(
    model.quantity * model.replacementValue.expected,
  );
  const eligibility = exclusions.length
    ? "excluded"
    : reasons.length
      ? "requires_review"
      : "eligible";
  return {
    id: "",
    sourceItemId,
    source,
    kind,
    name: model.name,
    category: model.category,
    brand: model.brand,
    model: model.model,
    quantity: model.quantity,
    condition: model.condition,
    identificationConfidence: declared ? null : model.confidence,
    replacementValue: model.replacementValue,
    valuationBasis: declared ? "user_declared" : model.valuationBasis,
    priceSource: declared ? "user_declared" : "model_estimate",
    visibleEvidence: declared ? [] : model.visibleEvidence,
    reviewReasons: reasons,
    eligibility,
    exclusionReasons: exclusions,
    expectedLineValue,
    eligibleLineValue:
      eligibility === "eligible"
        ? roundMoney(
            model.quantity *
              Math.min(
                model.replacementValue.expected,
                TRAVELER_DEMO_TERMS.perPhysicalItemLimit,
              ),
          )
        : 0,
  };
}
export function quoteTravelerStorage(
  input: { draft: TravelerInventoryDraft; confirmation: InventoryConfirmation },
  dependencies: { now?: () => Date } = {},
): TravelerSessionQuote {
  const draft = parseTraveler(TravelerDraftSchema, input?.draft);
  const confirmation = parseTraveler(ConfirmationSchema, input.confirmation);
  const now = (dependencies.now ?? (() => new Date()))();
  if (Date.parse(draft.expiresAt) <= now.getTime())
    throw new StorageAnalysisError(
      "EXPIRED_DRAFT",
      "The inventory draft expired. Create a new draft.",
    );
  const assessment = assessStorageSession(draft.session, { now: () => now });
  const durationMinutes = assessment.durationMinutes;
  const byId = new Map(draft.items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  if (
    byId.size !== draft.items.length ||
    confirmation.decisions.length !== draft.items.length
  )
    throw new StorageAnalysisError(
      "INCOMPLETE_CONFIRMATION",
      "Include or exclude every detected item exactly once.",
    );
  const items: ConfirmedTravelerItem[] = [];
  for (const decision of confirmation.decisions) {
    const original = byId.get(decision.itemId);
    if (!original || seen.has(decision.itemId))
      throw new StorageAnalysisError(
        "INCOMPLETE_CONFIRMATION",
        "Each decision must reference a distinct detected item.",
      );
    seen.add(decision.itemId);
    if (!decision.include) continue;
    if (
      decision.correction &&
      (decision.quantity !== undefined ||
        decision.kind !== decision.correction.kind)
    )
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "A correction must specify its own quantity and matching item kind.",
      );
    if (decision.correction) {
      items.push(
        confirmedItem(
          declaredModel(decision.correction),
          "corrected",
          decision.kind,
          original.id,
          { ...original, quantity: decision.correction.quantity },
        ),
      );
    } else {
      if (original.quantity > 100 && decision.quantity === undefined)
        throw new StorageAnalysisError(
          "INVALID_REQUEST",
          "Confirm quantities of at most 100 units per entry.",
        );
      items.push(
        confirmedItem(
          { ...original, quantity: decision.quantity ?? original.quantity },
          "photo",
          decision.kind,
          original.id,
        ),
      );
    }
  }
  for (const item of confirmation.manualItems)
    items.push(confirmedItem(declaredModel(item), "manual", item.kind, null));
  if (!items.length)
    throw new StorageAnalysisError(
      "NO_SELECTED_ITEMS",
      "Select or declare at least one belonging.",
    );
  if (items.length > 100)
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Confirm no more than 100 inventory entries.",
    );
  const contents = items.filter((item) => item.kind === "contents");
  if (draft.coverageScope === "bag_only" && contents.length)
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Bag-only coverage cannot include contents.",
    );
  if (
    draft.photoCoverage === "bag_exterior_only" &&
    contents.some((item) => item.source === "photo")
  )
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "An exterior-only photo cannot establish bag contents; declare them manually or provide contents photos.",
    );
  const declaration = confirmation.attestations.contentsDeclaration;
  if (
    (declaration === "no_contents" && contents.length) ||
    (declaration === "all_contents_listed" && !contents.length)
  )
    throw new StorageAnalysisError(
      "INCOMPLETE_CONFIRMATION",
      "The contents declaration must match the confirmed inventory.",
    );
  items.forEach((item, index) => {
    item.id = `confirmed_${String(index + 1).padStart(3, "0")}`;
  });
  const total = aggregateValuation(items);
  const sum = (status: ConfirmedTravelerItem["eligibility"]) =>
    roundMoney(
      items
        .filter((item) => item.eligibility === status)
        .reduce((sum, item) => sum + item.expectedLineValue, 0),
    );
  const eligibleExpectedValue = sum("eligible"),
    excludedExpectedValue = sum("excluded"),
    pendingReviewExpectedValue = sum("requires_review");
  const cappedValue = roundMoney(
    items.reduce((sum, item) => sum + item.eligibleLineValue, 0),
  );
  const recommendedLimit = Math.min(
    TRAVELER_DEMO_TERMS.maximumSessionLimit,
    Math.ceil(cappedValue / 50) * 50,
  );
  const limit = confirmation.requestedCoverageLimit ?? recommendedLimit;
  if (limit > recommendedLimit)
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Requested coverage cannot exceed the eligible recommended limit.",
    );
  const perItemLimitReduction = roundMoney(eligibleExpectedValue - cappedValue);
  const aggregateLimitReduction = roundMoney(
    Math.max(0, cappedValue - TRAVELER_DEMO_TERMS.maximumSessionLimit),
  );
  const blockingReasons: string[] = [...assessment.blockingReasons];
  const nextActions: TravelerSessionQuote["nextActions"] = [];
  const type = draft.session.storage.type;
  if (type === "unattended") {
    nextActions.push({
      code: "choose_eligible_storage",
      message: "Choose staffed luggage storage or a secured locker.",
    });
  } else if (type === "unknown" || type === "private_host") {
    nextActions.push({
      code: "verify_storage",
      message: "Confirm the storage operator and arrangement before quoting.",
    });
  }
  for (const item of items)
    if (item.eligibility === "requires_review") {
      nextActions.push({
        code: "verify_item",
        itemId: item.id,
        message:
          "Provide identifying details, a close-up photo or purchase evidence; confirmation alone does not resolve this review.",
      });
    }
  if (items.some((item) => item.eligibility === "requires_review"))
    blockingReasons.push("items_require_verification");
  if (eligibleExpectedValue === 0 && pendingReviewExpectedValue === 0)
    blockingReasons.push("no_eligible_value");
  const status =
    blockingReasons.includes("unattended_storage_ineligible") ||
    blockingReasons.includes("no_eligible_value")
      ? "ineligible"
      : blockingReasons.length
        ? "requires_review"
        : "demo_quote_ready";
  const warnings = [
    "demo_only_not_an_insurance_policy",
    "valuation_uses_model_estimates_not_live_prices",
    "only_listed_eligible_items_considered",
    "replacement_estimate_is_not_a_claim_payment",
    "storage_details_are_user_declared",
  ];
  if (
    confirmation.manualItems.length ||
    items.some((item) => item.source === "corrected")
  )
    warnings.push("user_declared_values_not_verified");
  if (declaration === "unlisted_contents_excluded")
    warnings.push("unlisted_contents_excluded");
  if (excludedExpectedValue > 0)
    warnings.push("some_selected_items_are_excluded");
  if (eligibleExpectedValue > limit)
    warnings.push("coverage_below_eligible_estimated_value");
  if (limit > 0 && limit <= TRAVELER_DEMO_TERMS.deductible)
    warnings.push("coverage_limit_does_not_exceed_deductible");
  if (status === "demo_quote_ready")
    nextActions.push({
      code: "review_demo_terms",
      message:
        "Review the session, listed items, limits, deductible and exclusions. A licensed insurance partner must supply and issue any real coverage.",
    });
  return {
    version: "traveler-quote-v1",
    status,
    policyIssued: false,
    currency: "USD",
    session: draft.session,
    generatedAt: now.toISOString(),
    expiresAt: new Date(
      Math.min(now.getTime() + 15 * 60000, Date.parse(draft.session.startsAt)),
    ).toISOString(),
    items,
    valuation: {
      low: total.low,
      expected: total.expected,
      high: total.high,
      eligibleExpectedValue,
      excludedExpectedValue,
      pendingReviewExpectedValue,
    },
    coverage: {
      type: "demo_proposal",
      scope: "listed_items_only",
      limit,
      recommendedLimit,
      deductible: TRAVELER_DEMO_TERMS.deductible,
      maximumSessionLimit: TRAVELER_DEMO_TERMS.maximumSessionLimit,
      perPhysicalItemLimit: TRAVELER_DEMO_TERMS.perPhysicalItemLimit,
      perItemLimitReduction,
      aggregateLimitReduction,
      uncoveredEligibleValue: roundMoney(
        Math.max(0, eligibleExpectedValue - limit),
      ),
      prototypeEvents: [
        "theft_during_declared_storage",
        "accidental_damage_during_declared_storage",
      ],
      exclusions: [
        "unlisted_items_and_hidden_undeclared_contents",
        "cash_gift_cards_and_travel_documents",
        "food_and_perishables",
        "unattended_storage",
        "loss_outside_selected_session",
        "unresolved_items_pending_verification",
      ],
    },
    premium:
      status === "demo_quote_ready"
        ? calculateSessionPremium(limit, durationMinutes, type)
        : null,
    blockingReasons,
    warnings,
    nextActions,
  };
}
