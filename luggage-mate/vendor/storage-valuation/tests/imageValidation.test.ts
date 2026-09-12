import { it, expect } from "vitest";
import sharp from "sharp";
import { analyzeStorageContents } from "../src/services/analyzeStorageContents.js";
import { preprocessImage } from "../src/image/preprocessImage.js";
import { image, fixture } from "./helpers.js";
const provider = { analyze: async () => fixture() };
it("zero images", async () =>
  expect(analyzeStorageContents({ images: [] })).rejects.toMatchObject({
    code: "NO_IMAGES",
  }));
it("six images", async () =>
  expect(
    analyzeStorageContents({ images: Array(6).fill(await image()) }),
  ).rejects.toMatchObject({ code: "TOO_MANY_IMAGES" }));
it("unsupported MIME", async () =>
  expect(
    analyzeStorageContents({
      images: [{ buffer: Buffer.from("x"), mimeType: "image/gif" as never }],
    }),
  ).rejects.toMatchObject({ code: "UNSUPPORTED_IMAGE_TYPE" }));
it("empty image", async () =>
  expect(
    analyzeStorageContents({
      images: [{ buffer: Buffer.alloc(0), mimeType: "image/png" }],
    }),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE" }));
it("oversized", async () =>
  expect(
    analyzeStorageContents({ images: [await image()] }, { maxImageBytes: 1 }),
  ).rejects.toMatchObject({ code: "IMAGE_TOO_LARGE" }));
it("corrupt", async () =>
  expect(
    analyzeStorageContents(
      {
        images: [
          { buffer: Buffer.from("not an image"), mimeType: "image/png" },
        ],
      },
      { provider },
    ),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE" }));
it("MIME mismatch", async () =>
  expect(
    preprocessImage({ ...(await image()), mimeType: "image/jpeg" }),
  ).rejects.toMatchObject({ code: "INVALID_IMAGE" }));
it("does not upscale", async () =>
  expect(
    await sharp((await preprocessImage(await image())).buffer).metadata(),
  ).toMatchObject({ width: 32, height: 16, format: "jpeg" }));
it("resizes large images", async () => {
  const buffer = await sharp({
    create: { width: 3000, height: 1500, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  expect(
    await sharp(
      (await preprocessImage({ buffer, mimeType: "image/png" })).buffer,
    ).metadata(),
  ).toMatchObject({ width: 2048, height: 1024 });
});
it("corrects EXIF orientation", async () => {
  const buffer = await sharp((await image()).buffer)
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  expect(
    await sharp(
      (await preprocessImage({ buffer, mimeType: "image/jpeg" })).buffer,
    ).metadata(),
  ).toMatchObject({ width: 16, height: 32 });
});
