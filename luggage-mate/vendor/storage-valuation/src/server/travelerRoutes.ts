import { assessStorageSession } from "../traveler/assessStorageSession.js";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { StorageAnalysisError } from "../domain/errors.js";
import type { StorageImageInput, ImageMimeType } from "../domain/types.js";
import type { AnalyzeStorageContentsDependencies } from "../services/analyzeStorageContents.js";
import { DEFAULT_MAX_IMAGE_BYTES } from "../image/validateImage.js";
import { createTravelerInventoryDraft } from "../traveler/createTravelerInventoryDraft.js";
import { quoteTravelerStorage } from "../traveler/quoteTravelerStorage.js";
import {
  ConfirmationSchema,
  CoverageScopeSchema,
  PhotoCoverageSchema,
  StorageSessionSchema,
  parseTraveler,
} from "../traveler/schemas.js";
import { createDraftTokenCodec } from "./draftTokens.js";
export interface TravelerServerDependencies extends AnalyzeStorageContentsDependencies {
  draftSigningSecret?: string;
}
export function createTravelerRoutes(dependencies: TravelerServerDependencies) {
  const app = new Hono();
  const tokens = createDraftTokenCodec(
    dependencies.draftSigningSecret,
    dependencies.now,
  );
  const tooLarge = (c: import("hono").Context) =>
    c.json(
      {
        error: {
          code: "IMAGE_TOO_LARGE",
          message: "The request exceeds the upload limit.",
        },
      },
      413,
    );
  app.use("/session", bodyLimit({ maxSize: 16384, onError: tooLarge }));
  app.post("/session", async (c) => {
    if (!c.req.header("content-type")?.startsWith("application/json"))
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Use application/json.",
      );
    let value: unknown;
    try {
      value = await c.req.json();
    } catch (cause) {
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Invalid session JSON.",
        { cause },
      );
    }
    return c.json(
      assessStorageSession(
        parseTraveler(StorageSessionSchema, value),
        dependencies,
      ),
    );
  });
  app.use(
    "/draft",
    bodyLimit({
      maxSize:
        5 * (dependencies.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES) +
        1024 * 1024,
      onError: tooLarge,
    }),
  );
  app.post("/draft", async (c) => {
    if (!c.req.header("content-type")?.startsWith("multipart/form-data"))
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Use multipart/form-data.",
      );
    let form: FormData;
    try {
      form = await c.req.raw.formData();
    } catch (cause) {
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Invalid multipart request.",
        { cause },
      );
    }
    const metadata = form.getAll("metadata");
    if (metadata.length !== 1 || typeof metadata[0] !== "string")
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Supply one JSON metadata field.",
      );
    let value: unknown;
    try {
      value = JSON.parse(metadata[0]);
    } catch (cause) {
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Invalid metadata JSON.",
        { cause },
      );
    }
    const input = parseTraveler(
      z
        .object({
          session: StorageSessionSchema,
          coverageScope: CoverageScopeSchema,
          photoCoverage: PhotoCoverageSchema,
        })
        .strict(),
      value,
    );
    const files = form.getAll("images");
    if (files.length > 5)
      throw new StorageAnalysisError(
        "TOO_MANY_IMAGES",
        "Supply no more than five images.",
      );
    const images: StorageImageInput[] = await Promise.all(
      files.map(async (file) => {
        if (typeof file === "string")
          throw new StorageAnalysisError(
            "INVALID_IMAGE",
            "Each images field must be a file.",
          );
        return {
          buffer: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type as ImageMimeType,
        };
      }),
    );
    const draft = await createTravelerInventoryDraft(
      { ...input, images },
      dependencies,
    );
    return c.json({ draft, draftToken: tokens.encode(draft) });
  });
  app.use("/quote", bodyLimit({ maxSize: 4 * 1024 * 1024, onError: tooLarge }));
  app.post("/quote", async (c) => {
    if (!c.req.header("content-type")?.startsWith("application/json"))
      throw new StorageAnalysisError(
        "INVALID_REQUEST",
        "Use application/json.",
      );
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch (cause) {
      throw new StorageAnalysisError("INVALID_REQUEST", "Invalid quote JSON.", {
        cause,
      });
    }
    const input = parseTraveler(
      z
        .object({ draftToken: z.string(), confirmation: ConfirmationSchema })
        .strict(),
      raw,
    );
    const draft = tokens.decode(input.draftToken);
    return c.json(
      quoteTravelerStorage(
        { draft, confirmation: input.confirmation },
        dependencies,
      ),
    );
  });
  return app;
}
