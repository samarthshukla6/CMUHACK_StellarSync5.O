import { it, expect, vi } from "vitest";
import { createApp } from "../src/server/app.js";
import { createDraftTokenCodec } from "../src/server/draftTokens.js";
import { bag, session, now, draft, confirmation } from "./travelerHelpers.js";
import { image } from "./helpers.js";
it("full signed HTTP draft -> confirmation -> quote; only one AI call", async () => {
  const analyze = vi.fn(async () => ({ items: [bag()] }));
  const app = createApp({ provider: { analyze }, now });
  const form = new FormData();
  form.append(
    "images",
    new Blob([new Uint8Array((await image()).buffer)], { type: "image/png" }),
    "bag.png",
  );
  form.append(
    "metadata",
    JSON.stringify({
      session,
      coverageScope: "bag_only",
      photoCoverage: "bag_exterior_only",
    }),
  );
  const res = await app.request("/traveler/draft", {
    method: "POST",
    body: form,
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.draft).not.toHaveProperty("premium");
  const quoted = await app.request("/traveler/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      draftToken: body.draftToken,
      confirmation: confirmation(body.draft),
    }),
  });
  expect(quoted.status).toBe(200);
  expect(await quoted.json()).toMatchObject({
    status: "demo_quote_ready",
    policyIssued: false,
    premium: { totalPremium: 1.49 },
  });
  expect(analyze).toHaveBeenCalledTimes(1);
});
it("tampered draft rejected", async () => {
  const d = await draft();
  const codec = createDraftTokenCodec("a".repeat(32), now);
  const token = codec.encode(d);
  const [payload, sig] = token.split(".");
  const envelope = JSON.parse(Buffer.from(payload!, "base64url").toString());
  envelope.draft.items[0].replacementValue.expected = 1;
  const forged =
    Buffer.from(JSON.stringify(envelope)).toString("base64url") + "." + sig;
  expect(() => codec.decode(forged)).toThrowError(
    expect.objectContaining({ code: "INVALID_DRAFT_TOKEN" }),
  );
});
it("token expires at 30 minutes", async () => {
  let time = now();
  const codec = createDraftTokenCodec("a".repeat(32), () => time);
  const token = codec.encode(await draft());
  time = new Date(time.getTime() + 30 * 60000);
  expect(() => codec.decode(token)).toThrowError(
    expect.objectContaining({ code: "EXPIRED_DRAFT" }),
  );
});
it("different app key rejects old token", async () => {
  const d = await draft();
  const token = createDraftTokenCodec("a".repeat(32), now).encode(d);
  expect(() =>
    createDraftTokenCodec("b".repeat(32), now).decode(token),
  ).toThrow();
});
it.each(["bad", "a.b.c", "a.b", ""])("malformed token %#", (token) =>
  expect(() =>
    createDraftTokenCodec("a".repeat(32), now).decode(token),
  ).toThrow(),
);
it("short signing key rejected", () =>
  expect(() => createApp({ draftSigningSecret: "short" })).toThrow());
it("invalid token HTTP response is safe", async () => {
  const d = await draft();
  const app = createApp({ now });
  const response = await app.request("/traveler/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ draftToken: "bad", confirmation: confirmation(d) }),
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: { code: "INVALID_DRAFT_TOKEN" },
  });
});
it("rejects malformed metadata without invoking provider", async () => {
  const analyze = vi.fn();
  const app = createApp({ provider: { analyze }, now });
  const form = new FormData();
  form.append("metadata", "{broken");
  const r = await app.request("/traveler/draft", {
    method: "POST",
    body: form,
  });
  expect(r.status).toBe(400);
  expect(analyze).not.toHaveBeenCalled();
});
it("quote body limit enforced", async () => {
  const app = createApp({ now });
  const r = await app.request("/traveler/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(4 * 1024 * 1024 + 1),
  });
  expect(r.status).toBe(413);
});

it("session eligibility can be checked before any AI call", async () => {
  const analyze = vi.fn();
  const app = createApp({ provider: { analyze }, now });
  const r = await app.request("/traveler/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...session,
      storage: { ...session.storage, type: "unattended" },
    }),
  });
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({
    status: "ineligible",
    storageVerified: false,
    nextAction: "choose_eligible_storage",
  });
  expect(analyze).not.toHaveBeenCalled();
});
