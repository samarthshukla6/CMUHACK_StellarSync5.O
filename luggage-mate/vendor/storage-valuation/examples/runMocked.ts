import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { analyzeStorageContents, validateModelResponse } from "../src/index.js";
// Synthetic pixels exercise decoding only; inventories are explicitly mocked.
const buffer = await sharp({
  create: { width: 16, height: 16, channels: 3, background: "#eeeeee" },
})
  .png()
  .toBuffer();
for (const scenario of ["ordinary-box", "electronics-box", "uncertain-watch"]) {
  const fixture = validateModelResponse(
    JSON.parse(
      await readFile(
        new URL(
          `../fixtures/model-responses/${scenario}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  const result = await analyzeStorageContents(
    { images: [{ buffer, mimeType: "image/png" }] },
    {
      provider: {
        metadata: { provider: "mock", model: scenario },
        analyze: async () => fixture,
      },
    },
  );
  const json = JSON.stringify(result, null, 2);
  await writeFile(
    new URL(`./${scenario}.result.json`, import.meta.url),
    json + "\n",
  );
  console.log(json);
}
