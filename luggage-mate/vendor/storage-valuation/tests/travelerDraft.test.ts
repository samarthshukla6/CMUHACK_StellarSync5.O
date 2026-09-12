import { it, expect, vi } from "vitest";
import { createTravelerInventoryDraft } from "../src/traveler/createTravelerInventoryDraft.js";
import { image } from "./helpers.js";
import { bag, session, now } from "./travelerHelpers.js";
it("draft has estimates and actions, never a premium", async () => {
  const analyze = vi.fn(async () => ({ items: [bag()] }));
  const result = await createTravelerInventoryDraft(
    {
      images: [await image(), await image()],
      session,
      coverageScope: "bag_only",
      photoCoverage: "bag_exterior_only",
    },
    { provider: { analyze }, now },
  );
  expect(result.status).toBe("awaiting_confirmation");
  expect(result).not.toHaveProperty("premium");
  expect(result).not.toHaveProperty("coverage");
  expect(result.warnings).toContain("contents_not_visible");
  expect(result.estimatedValue.expected).toBe(50);
  expect(result.expiresAt).toBe("2030-01-01T08:30:00.000Z");
  expect(analyze).toHaveBeenCalledTimes(1);
  expect(analyze).toHaveBeenCalledWith(expect.any(Array), {
    useCase: "traveler_storage",
    coverageScope: "bag_only",
    photoCoverage: "bag_exterior_only",
  });
});
it.each([
  { startsAt: "2029-12-31T10:00:00Z" },
  { endsAt: "2030-01-01T09:00:00Z" },
  { endsAt: "2030-01-09T10:00:00Z" },
  { startsAt: "2030-01-01T08:00:00Z" },
  { startsAt: "invalid" },
])("rejects invalid session before AI %#", async (patch) => {
  const analyze = vi.fn();
  await expect(
    createTravelerInventoryDraft(
      {
        images: [await image()],
        session: { ...session, ...patch },
        coverageScope: "bag_only",
        photoCoverage: "bag_exterior_only",
      },
      { provider: { analyze }, now },
    ),
  ).rejects.toThrow();
  expect(analyze).not.toHaveBeenCalled();
});
it("rejects missing location and unsupported country", async () => {
  await expect(
    createTravelerInventoryDraft(
      {
        images: [await image()],
        session: {
          ...session,
          storage: { ...session.storage, countryCode: "GB" as never },
        },
        coverageScope: "bag_only",
        photoCoverage: "bag_exterior_only",
      },
      { now },
    ),
  ).rejects.toMatchObject({ code: "INVALID_REQUEST" });
});
