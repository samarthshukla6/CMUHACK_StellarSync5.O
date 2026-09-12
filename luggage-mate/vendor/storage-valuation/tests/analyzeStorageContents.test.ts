import { it, expect, vi } from "vitest";
import { analyzeStorageContents } from "../src/services/analyzeStorageContents.js";
import { fixture, image } from "./helpers.js";
it.each([
  ["ordinary-box", "auto_quoted"],
  ["electronics-box", "auto_quoted"],
  ["uncertain-watch", "provisional"],
])("scenario %s", async (name, status) => {
  const result = await analyzeStorageContents(
    { images: [await image()] },
    {
      provider: { analyze: async () => fixture(name) },
      now: () => new Date("2026-01-01T00:00:00Z"),
    },
  );
  expect(result.status).toBe(status);
  expect(result.warnings).toContain(
    "valuation_uses_model_estimates_not_live_prices",
  );
  expect(result.items[0]?.id).toBe("item_001");
  expect(result.metadata.analyzedAt).toBe("2026-01-01T00:00:00.000Z");
});
it("three photos sent once; quantity stays one", async () => {
  const analyze = vi.fn(
    async (_images: import("../src/domain/types.js").ProcessedStorageImage[]) =>
      fixture("duplicates"),
  );
  const result = await analyzeStorageContents(
    { images: [await image(), await image(), await image()] },
    { provider: { analyze } },
  );
  expect(analyze).toHaveBeenCalledTimes(1);
  expect(analyze.mock.calls[0]?.[0]).toHaveLength(3);
  expect(result.totals.expected).toBe(450);
  expect(result.imagesAnalyzed).toBe(3);
});
it("revalidates custom provider", async () =>
  expect(
    analyzeStorageContents(
      { images: [await image()] },
      { provider: { analyze: async () => ({ items: [{}] }) as never } },
    ),
  ).rejects.toMatchObject({ code: "INVALID_AI_RESPONSE" }));
it("wraps arbitrary provider errors", async () =>
  expect(
    analyzeStorageContents(
      { images: [await image()] },
      {
        provider: {
          analyze: async () => {
            throw new Error("secret");
          },
        },
      },
    ),
  ).rejects.toMatchObject({
    code: "AI_PROVIDER_ERROR",
    message: "Inventory analysis is temporarily unavailable.",
  }));
it("rejects risk before provider call", async () => {
  const analyze = vi.fn();
  await expect(
    analyzeStorageContents(
      { images: [await image()], riskMultiplier: 0 },
      { provider: { analyze } },
    ),
  ).rejects.toMatchObject({ code: "INVALID_RISK_MULTIPLIER" });
  expect(analyze).not.toHaveBeenCalled();
});

it("rejects null risk at runtime", async () => {
  await expect(
    analyzeStorageContents({
      images: [await image()],
      riskMultiplier: null as never,
    }),
  ).rejects.toMatchObject({ code: "INVALID_RISK_MULTIPLIER" });
});
