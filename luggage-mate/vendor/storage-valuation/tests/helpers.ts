import { readFileSync } from "node:fs";
import sharp from "sharp";
import { validateModelResponse } from "../src/domain/schemas.js";
export const fixture = (name = "ordinary-box") =>
  validateModelResponse(
    JSON.parse(
      readFileSync(
        new URL(`../fixtures/model-responses/${name}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
export const baseItem = () => structuredClone(fixture().items[0]!);
export const image = async () => ({
  buffer: await sharp({
    create: { width: 32, height: 16, channels: 3, background: "white" },
  })
    .png()
    .toBuffer(),
  mimeType: "image/png" as const,
});
