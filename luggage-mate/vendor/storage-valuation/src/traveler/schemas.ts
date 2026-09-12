import { z } from "zod";
import { ModelInventoryItemSchema } from "../domain/schemas.js";
import { StorageAnalysisError } from "../domain/errors.js";

export const CoverageScopeSchema = z.enum(["bag_only", "bag_and_contents"]);
export const PhotoCoverageSchema = z.enum([
  "bag_exterior_only",
  "visible_contents",
]);
export const StorageSessionSchema = z
  .object({
    startsAt: z.iso.datetime({ offset: true }),
    endsAt: z.iso.datetime({ offset: true }),
    storage: z
      .object({
        type: z.enum([
          "staffed_storage",
          "secured_locker",
          "private_host",
          "unattended",
          "unknown",
        ]),
        locationName: z.string().trim().min(1).max(200),
        address: z.string().trim().min(1).max(500),
        countryCode: z.literal("US"),
        custodianName: z.string().trim().min(1).max(200),
        bookingReference: z.string().trim().min(1).max(200).optional(),
      })
      .strict(),
  })
  .strict();
export const DraftItemSchema = ModelInventoryItemSchema.extend({
  id: z.string().regex(/^item_\d{3}$/),
});
export const TravelerDraftSchema = z
  .object({
    version: z.literal("traveler-draft-v1"),
    status: z.literal("awaiting_confirmation"),
    expiresAt: z.iso.datetime(),
    currency: z.literal("USD"),
    session: StorageSessionSchema,
    coverageScope: CoverageScopeSchema,
    photoCoverage: PhotoCoverageSchema,
    imagesAnalyzed: z.number().int().min(1).max(5),
    items: z.array(DraftItemSchema).min(1).max(100),
    estimatedValue: z
      .object({
        low: z.number().nonnegative(),
        expected: z.number().nonnegative(),
        high: z.number().nonnegative(),
      })
      .strict(),
    warnings: z.array(z.string()),
    requiredActions: z.array(z.string()),
    metadata: z
      .object({
        provider: z.string(),
        model: z.string(),
        analyzedAt: z.iso.datetime(),
      })
      .strict(),
  })
  .strict();
export const DeclaredItemSchema = z
  .object({
    name: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(200),
    brand: z.string().trim().min(1).max(200).nullable(),
    model: z.string().trim().min(1).max(200).nullable(),
    quantity: z.number().int().min(1).max(100),
    condition: z.enum(["new", "like_new", "good", "fair", "poor", "unknown"]),
    declaredUnitValue: z
      .number()
      .min(0)
      .max(1000000)
      .refine(
        (n) =>
          Number.isSafeInteger(Math.round(n * 100)) &&
          Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
        "Use at most two decimal places.",
      ),
    kind: z.enum(["bag", "contents"]),
  })
  .strict();
export const ItemDecisionSchema = z.discriminatedUnion("include", [
  z.object({ itemId: z.string(), include: z.literal(false) }).strict(),
  z
    .object({
      itemId: z.string(),
      include: z.literal(true),
      kind: z.enum(["bag", "contents"]),
      quantity: z.number().int().min(1).max(100).optional(),
      correction: DeclaredItemSchema.optional(),
    })
    .strict(),
]);
export const ConfirmationSchema = z
  .object({
    decisions: z.array(ItemDecisionSchema).max(100),
    manualItems: z.array(DeclaredItemSchema).max(100).default([]),
    attestations: z
      .object({
        inventoryConfirmed: z.literal(true),
        belongsToTraveler: z.literal(true),
        onlyListedItemsConsidered: z.literal(true),
        contentsDeclaration: z.enum([
          "no_contents",
          "all_contents_listed",
          "unlisted_contents_excluded",
        ]),
      })
      .strict(),
    requestedCoverageLimit: z
      .number()
      .positive()
      .max(5000)
      .multipleOf(50)
      .optional(),
  })
  .strict();
export type StorageSession = z.infer<typeof StorageSessionSchema>;
export type CoverageScope = z.infer<typeof CoverageScopeSchema>;
export type PhotoCoverage = z.infer<typeof PhotoCoverageSchema>;
export type TravelerInventoryDraft = z.infer<typeof TravelerDraftSchema>;
export type InventoryConfirmation = z.input<typeof ConfirmationSchema>;
export type DeclaredItem = z.infer<typeof DeclaredItemSchema>;
export function parseTraveler<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Traveler request contains invalid or missing fields.",
      { cause: result.error },
    );
  return result.data;
}
export function validateSession(session: StorageSession, now: Date): number {
  const start = Date.parse(session.startsAt),
    end = Date.parse(session.endsAt);
  if (
    !Number.isFinite(now.getTime()) ||
    start <= now.getTime() ||
    end <= start ||
    end - start > 7 * 24 * 3600000
  )
    throw new StorageAnalysisError(
      "INVALID_SESSION",
      "Use a future storage session lasting more than zero and no more than seven days.",
    );
  return Math.ceil((end - start) / 60000);
}
