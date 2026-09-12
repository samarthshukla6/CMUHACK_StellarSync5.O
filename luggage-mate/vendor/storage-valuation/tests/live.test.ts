import "dotenv/config";
import { it, expect } from "vitest";
import { analyzeStorageContents } from "../src/index.js";
import { loadImages } from "../src/cli/loadImages.js";
// Explicitly opt in so normal tests never depend on remote availability.
it.skipIf(
  process.env.RUN_LIVE_GEMINI !== "1" ||
    !process.env.GEMINI_API_KEY ||
    !process.env.LIVE_IMAGE_PATHS,
)(
  "live supplied photographs",
  async () => {
    const images = await loadImages(process.env.LIVE_IMAGE_PATHS!.split(","));
    const result = await analyzeStorageContents({ images });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.metadata.provider).toBe("gemini");
  },
  180000,
);
