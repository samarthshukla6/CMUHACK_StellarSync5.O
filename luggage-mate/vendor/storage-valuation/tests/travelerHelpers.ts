import type { ModelInventoryItem } from "../src/domain/types.js";
import { createTravelerInventoryDraft } from "../src/traveler/createTravelerInventoryDraft.js";
import type {
  StorageSession,
  InventoryConfirmation,
  TravelerInventoryDraft,
} from "../src/traveler/schemas.js";
import { baseItem, image } from "./helpers.js";
export const now = () => new Date("2030-01-01T08:00:00Z");
export const session: StorageSession = {
  startsAt: "2030-01-01T10:00:00Z",
  endsAt: "2030-01-01T16:00:00Z",
  storage: {
    type: "staffed_storage",
    locationName: "Demo luggage desk",
    address: "123 Example Street, New York, NY",
    countryCode: "US",
    custodianName: "Demo operator",
  },
};
export const bag = (): ModelInventoryItem => ({
  ...baseItem(),
  name: "JanSport backpack",
  category: "backpacks",
  brand: "JanSport",
  model: "Big Student",
  confidence: 0.9,
  valuationBasis: "probable_model",
  replacementValue: { low: 35, expected: 50, high: 60 },
});
export const watch = (): ModelInventoryItem => ({
  ...bag(),
  name: "Casio F-91W watch",
  category: "watch",
  brand: "Casio",
  model: "F-91W",
  valuationBasis: "exact_model",
  confidence: 0.99,
  replacementValue: { low: 15, expected: 20, high: 25 },
});
export async function draft(
  items: ModelInventoryItem[] = [bag()],
  overrides: Partial<Parameters<typeof createTravelerInventoryDraft>[0]> = {},
): Promise<TravelerInventoryDraft> {
  return createTravelerInventoryDraft(
    {
      images: [await image()],
      session,
      coverageScope: "bag_and_contents",
      photoCoverage: "visible_contents",
      ...overrides,
    },
    {
      provider: {
        metadata: { provider: "mock", model: "traveler-tests" },
        analyze: async () => ({ items }),
      },
      now,
    },
  );
}
export function confirmation(d: TravelerInventoryDraft): InventoryConfirmation {
  return {
    decisions: d.items.map((item) => ({
      itemId: item.id,
      include: true as const,
      kind: "bag" as const,
    })),
    manualItems: [],
    attestations: {
      inventoryConfirmed: true,
      belongsToTraveler: true,
      onlyListedItemsConsidered: true,
      contentsDeclaration: "unlisted_contents_excluded",
    },
  };
}
