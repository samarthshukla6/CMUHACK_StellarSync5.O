import "dotenv/config";
import { analyzeStorageContents } from "../services/analyzeStorageContents.js";
import { safeError } from "../domain/errors.js";
import { loadImages } from "./loadImages.js";
try {
  console.log(
    JSON.stringify(
      await analyzeStorageContents({
        images: await loadImages(process.argv.slice(2)),
      }),
      null,
      2,
    ),
  );
} catch (error) {
  console.error(JSON.stringify({ error: safeError(error) }, null, 2));
  process.exitCode = 1;
}
