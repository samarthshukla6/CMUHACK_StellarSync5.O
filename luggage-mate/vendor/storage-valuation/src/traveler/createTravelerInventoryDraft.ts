import type { StorageImageInput } from "../domain/types.js";
import type { AnalyzeStorageContentsDependencies } from "../services/analyzeStorageContents.js";
import { extractStorageInventory } from "../services/extractStorageInventory.js";
import { aggregateValuation } from "../services/valuation.js";
import {
  CoverageScopeSchema,
  PhotoCoverageSchema,
  StorageSessionSchema,
  TravelerDraftSchema,
  parseTraveler,
  validateSession,
  type StorageSession,
  type CoverageScope,
  type PhotoCoverage,
  type TravelerInventoryDraft,
} from "./schemas.js";
export interface CreateTravelerDraftInput {
  images: StorageImageInput[];
  session: StorageSession;
  coverageScope: CoverageScope;
  photoCoverage: PhotoCoverage;
}
export async function createTravelerInventoryDraft(
  input: CreateTravelerDraftInput,
  dependencies: AnalyzeStorageContentsDependencies = {},
): Promise<TravelerInventoryDraft> {
  const session = parseTraveler(StorageSessionSchema, input?.session);
  const coverageScope = parseTraveler(CoverageScopeSchema, input.coverageScope);
  const photoCoverage = parseTraveler(PhotoCoverageSchema, input.photoCoverage);
  validateSession(session, (dependencies.now ?? (() => new Date()))());
  const extracted = await extractStorageInventory(
    { images: input.images },
    dependencies,
    { useCase: "traveler_storage", coverageScope, photoCoverage },
  );
  const totals = aggregateValuation(extracted.inventory.items);
  return parseTraveler(TravelerDraftSchema, {
    version: "traveler-draft-v1",
    status: "awaiting_confirmation",
    expiresAt: new Date(
      Math.min(
        Date.parse(extracted.metadata.analyzedAt) + 30 * 60000,
        Date.parse(session.startsAt),
      ),
    ).toISOString(),
    currency: "USD",
    session,
    coverageScope,
    photoCoverage,
    imagesAnalyzed: extracted.imagesAnalyzed,
    items: extracted.inventory.items.map((item, index) => ({
      ...item,
      id: `item_${String(index + 1).padStart(3, "0")}`,
    })),
    estimatedValue: {
      low: totals.low,
      expected: totals.expected,
      high: totals.high,
    },
    warnings: [
      "valuation_uses_model_estimates_not_live_prices",
      "hidden_contents_not_inferred",
      "draft_is_not_coverage",
      ...(photoCoverage === "bag_exterior_only"
        ? ["contents_not_visible"]
        : []),
    ],
    requiredActions: [
      "include_or_exclude_each_detected_item",
      "declare_unseen_contents_or_exclude_them",
      "confirm_inventory_and_ownership",
    ],
    metadata: extracted.metadata,
  });
}
