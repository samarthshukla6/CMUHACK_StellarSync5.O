import { readFile, writeFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import {
  createTravelerInventoryDraft,
  quoteTravelerStorage,
  validateModelResponse,
  type InventoryConfirmation,
  type StorageSession,
} from "../src/index.js";
const output = new URL("./traveler/", import.meta.url);
await mkdir(output, { recursive: true });
const instant = new Date();
const now = () => instant;
const session: StorageSession = {
  startsAt: new Date(instant.getTime() + 3600000).toISOString(),
  endsAt: new Date(instant.getTime() + 7 * 3600000).toISOString(),
  storage: {
    type: "staffed_storage",
    locationName: "Demo luggage desk",
    address: "123 Example Street, New York, NY",
    countryCode: "US",
    custodianName: "Demo operator",
  },
};
const saved = JSON.parse(
  await readFile(
    new URL("./live/backpack-kanken.json", import.meta.url),
    "utf8",
  ),
);
const inventory = validateModelResponse({
  items: saved.result.items.map((item: Record<string, unknown>) => ({
    name: item.name,
    category: item.category,
    brand: item.brand,
    model: item.model,
    quantity: item.quantity,
    condition: item.condition,
    confidence: item.confidence,
    replacementValue: item.replacementValue,
    valuationBasis: item.valuationBasis,
    visibleEvidence: item.visibleEvidence,
    suggestedNeedsReview: false,
    suggestedReviewReason: null,
  })),
});
// Replay a recorded live inventory, without another inference. Synthetic pixels
// exercise preprocessing only; confirmation explicitly removes wearer clothing.
const buffer = await sharp({
  create: { width: 16, height: 16, channels: 3, background: "white" },
})
  .png()
  .toBuffer();
const manual = {
  name: "Assorted clothing inside bag",
  category: "clothing",
  brand: null,
  model: null,
  quantity: 1,
  condition: "good" as const,
  declaredUnitValue: 100,
  kind: "contents" as const,
};
const summaries = [];
for (const scenario of [
  "bag-only",
  "bag-and-declared-contents",
  "unverified-laptop",
  "unattended-storage",
]) {
  const metadata = {
    session: {
      ...session,
      storage: {
        ...session.storage,
        type:
          scenario === "unattended-storage"
            ? ("unattended" as const)
            : ("staffed_storage" as const),
      },
    },
    coverageScope:
      scenario === "bag-only"
        ? ("bag_only" as const)
        : ("bag_and_contents" as const),
    photoCoverage: "bag_exterior_only" as const,
  };
  const draft = await createTravelerInventoryDraft(
    { images: [{ buffer, mimeType: "image/png" }], ...metadata },
    {
      provider: {
        metadata: { provider: "mock", model: "recorded-backpack-replay" },
        analyze: async () => inventory,
      },
      now,
    },
  );
  const confirmation: InventoryConfirmation = {
    decisions: draft.items.map((item, index) =>
      index === 0
        ? { itemId: item.id, include: true, kind: "bag" }
        : { itemId: item.id, include: false },
    ),
    manualItems:
      scenario === "bag-and-declared-contents"
        ? [manual]
        : scenario === "unverified-laptop"
          ? [
              {
                ...manual,
                name: "Laptop",
                category: "electronics",
                declaredUnitValue: 900,
              },
            ]
          : [],
    attestations: {
      inventoryConfirmed: true,
      belongsToTraveler: true,
      onlyListedItemsConsidered: true,
      contentsDeclaration:
        scenario === "bag-and-declared-contents" ||
        scenario === "unverified-laptop"
          ? "all_contents_listed"
          : "unlisted_contents_excluded",
    },
  };
  const quote = quoteTravelerStorage({ draft, confirmation }, { now });
  for (const [suffix, value] of [
    ["metadata", metadata],
    ["draft", draft],
    ["confirmation", confirmation],
    ["quote", quote],
  ] as const)
    await writeFile(
      new URL(`${scenario}.${suffix}.json`, output),
      JSON.stringify(value, null, 2) + "\n",
    );
  console.log(JSON.stringify({ scenario, quote }, null, 2));
  summaries.push({
    scenario,
    status: quote.status,
    estimatedValue: quote.valuation.expected,
    coverageLimit: quote.coverage.limit,
    totalPremium: quote.premium?.totalPremium ?? null,
    blockingReasons: quote.blockingReasons,
  });
}
await writeFile(
  new URL("summary.json", output),
  JSON.stringify(summaries, null, 2) + "\n",
);
