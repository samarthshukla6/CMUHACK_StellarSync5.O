import type { ModelInventoryItem } from "../domain/types.js";
import type { StorageSession } from "./schemas.js";
export interface ConfirmedTravelerItem {
  id: string;
  sourceItemId: string | null;
  source: "photo" | "corrected" | "manual";
  kind: "bag" | "contents";
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  quantity: number;
  condition: ModelInventoryItem["condition"];
  identificationConfidence: number | null;
  replacementValue: ModelInventoryItem["replacementValue"];
  valuationBasis: ModelInventoryItem["valuationBasis"] | "user_declared";
  priceSource: "model_estimate" | "user_declared";
  visibleEvidence: string[];
  reviewReasons: string[];
  eligibility: "eligible" | "requires_review" | "excluded";
  exclusionReasons: string[];
  expectedLineValue: number;
  eligibleLineValue: number;
}
export interface SessionPremium {
  type: "demo_only";
  ratingVersion: "traveler-demo-v1";
  currency: "USD";
  durationMinutes: number;
  durationHours: number;
  durationBand: "up_to_6_hours" | "up_to_24_hours" | "multi_day";
  additionalDays: number;
  ratePer100: number;
  storageMultiplier: number;
  minimumSessionPremium: number;
  totalPremium: number;
}
export interface TravelerSessionQuote {
  version: "traveler-quote-v1";
  status: "demo_quote_ready" | "requires_review" | "ineligible";
  policyIssued: false;
  currency: "USD";
  session: StorageSession;
  generatedAt: string;
  expiresAt: string;
  items: ConfirmedTravelerItem[];
  valuation: {
    low: number;
    expected: number;
    high: number;
    eligibleExpectedValue: number;
    excludedExpectedValue: number;
    pendingReviewExpectedValue: number;
  };
  coverage: {
    type: "demo_proposal";
    scope: "listed_items_only";
    limit: number;
    recommendedLimit: number;
    deductible: number;
    maximumSessionLimit: number;
    perPhysicalItemLimit: number;
    perItemLimitReduction: number;
    aggregateLimitReduction: number;
    uncoveredEligibleValue: number;
    prototypeEvents: string[];
    exclusions: string[];
  };
  premium: SessionPremium | null;
  blockingReasons: string[];
  warnings: string[];
  nextActions: { code: string; itemId?: string; message: string }[];
}
