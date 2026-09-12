import { it, expect } from "vitest";
import { createApp } from "../src/server/app.js";
import { fixture, image } from "./helpers.js";
const app = createApp({ provider: { analyze: async () => fixture() } });
it("health", async () =>
  expect(await (await app.request("/health")).json()).toEqual({
    status: "ok",
  }));
it("multipart analyzes two photos", async () => {
  const form = new FormData();
  const img = await image();
  for (let i = 0; i < 2; i++)
    form.append(
      "images",
      new Blob([new Uint8Array(img.buffer)], { type: img.mimeType }),
      "box.png",
    );
  form.append("riskMultiplier", "2");
  const response = await app.request("/analyze", {
    method: "POST",
    body: form,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    imagesAnalyzed: 2,
    status: "auto_quoted",
    premium: { riskMultiplier: 2 },
  });
});
it("invalid body returns safe JSON", async () => {
  const response = await app.request("/analyze", {
    method: "POST",
    body: "bad",
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({
    error: { code: "INVALID_REQUEST" },
  });
});
it("empty form", async () =>
  expect(
    (await app.request("/analyze", { method: "POST", body: new FormData() }))
      .status,
  ).toBe(400));
it("request limit", async () => {
  const small = createApp({ maxImageBytes: 1 });
  const response = await small.request("/analyze", {
    method: "POST",
    body: "x".repeat(1024 * 1024 + 6),
  });
  expect(response.status).toBe(413);
});
it("provider error sanitized", async () => {
  const broken = createApp({
    provider: {
      analyze: async () => {
        throw new Error("API secret");
      },
    },
  });
  const form = new FormData();
  form.append(
    "images",
    new Blob([new Uint8Array((await image()).buffer)], { type: "image/png" }),
    "box.png",
  );
  const response = await broken.request("/analyze", {
    method: "POST",
    body: form,
  });
  expect(response.status).toBe(502);
  expect(await response.text()).not.toContain("secret");
});
