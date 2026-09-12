import "dotenv/config";
import { readFile } from "node:fs/promises";
import { createTravelerInventoryDraft } from "../traveler/createTravelerInventoryDraft.js";
import { quoteTravelerStorage } from "../traveler/quoteTravelerStorage.js";
import { loadImages } from "./loadImages.js";
import { StorageAnalysisError, safeError } from "../domain/errors.js";
import { z } from "zod";
import {
  parseTraveler,
  StorageSessionSchema,
  CoverageScopeSchema,
  PhotoCoverageSchema,
  TravelerDraftSchema,
  ConfirmationSchema,
} from "../traveler/schemas.js";
async function jsonFile(path: string | undefined): Promise<unknown> {
  if (!path)
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Usage: traveler draft metadata.json photo.jpg [photo2.jpg] OR traveler quote draft.json confirmation.json",
    );
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (cause) {
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "A JSON input file could not be read or parsed.",
      { cause },
    );
  }
}
try {
  const [command, first, ...rest] = process.argv.slice(2);
  if (command === "draft") {
    const metadata = parseTraveler(
      z
        .object({
          session: StorageSessionSchema,
          coverageScope: CoverageScopeSchema,
          photoCoverage: PhotoCoverageSchema,
        })
        .strict(),
      await jsonFile(first),
    );
    console.log(
      JSON.stringify(
        await createTravelerInventoryDraft({
          ...metadata,
          images: await loadImages(rest),
        }),
        null,
        2,
      ),
    );
  } else if (command === "quote" && rest.length === 1) {
    const draft = parseTraveler(TravelerDraftSchema, await jsonFile(first));
    const confirmation = parseTraveler(
      ConfirmationSchema,
      await jsonFile(rest[0]),
    );
    console.log(
      JSON.stringify(quoteTravelerStorage({ draft, confirmation }), null, 2),
    );
  } else
    throw new StorageAnalysisError(
      "INVALID_REQUEST",
      "Usage: traveler draft metadata.json photo.jpg [photo2.jpg] OR traveler quote draft.json confirmation.json",
    );
} catch (error) {
  console.error(JSON.stringify({ error: safeError(error) }, null, 2));
  process.exitCode = 1;
}
