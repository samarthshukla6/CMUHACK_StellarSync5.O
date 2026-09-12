import {
  createTravelerRoutes,
  type TravelerServerDependencies,
} from "./travelerRoutes.js";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  analyzeStorageContents,
  type AnalyzeStorageContentsDependencies,
} from "../services/analyzeStorageContents.js";
import { DEFAULT_MAX_IMAGE_BYTES } from "../image/validateImage.js";
import { safeError, StorageAnalysisError } from "../domain/errors.js";
import type { ImageMimeType, StorageImageInput } from "../domain/types.js";
export function createApp(dependencies: TravelerServerDependencies = {}) {
  const app = new Hono();
  app.get("/health", (c) => c.json({ status: "ok" }));
  app.use(
    "/analyze",
    bodyLimit({
      maxSize:
        5 * (dependencies.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES) +
        1024 * 1024,
      onError: (c) =>
        c.json(
          {
            error: {
              code: "IMAGE_TOO_LARGE",
              message: "The request exceeds the upload limit.",
            },
          },
          413,
        ),
    }),
  );
  app.post("/analyze", async (c) => {
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
        "The multipart request is invalid.",
        { cause },
      );
    }
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
          filename: file.name,
        };
      }),
    );
    const risk = form.getAll("riskMultiplier");
    if (
      risk.length > 1 ||
      (risk.length && (typeof risk[0] !== "string" || !risk[0].trim()))
    )
      throw new StorageAnalysisError(
        "INVALID_RISK_MULTIPLIER",
        "Supply one numeric risk multiplier.",
      );
    return c.json(
      await analyzeStorageContents(
        { images, riskMultiplier: risk.length ? Number(risk[0]) : undefined },
        dependencies,
      ),
    );
  });
  app.route("/traveler", createTravelerRoutes(dependencies));
  app.onError((error, c) => {
    const safe = safeError(error);
    const status =
      safe.code === "IMAGE_TOO_LARGE"
        ? 413
        : safe.code === "UNSUPPORTED_IMAGE_TYPE"
          ? 415
          : ["AI_PROVIDER_ERROR", "INVALID_AI_RESPONSE"].includes(safe.code)
            ? 502
            : safe.code === "EMPTY_AI_RESPONSE"
              ? 422
              : ["INTERNAL_ERROR", "INVALID_CONFIGURATION"].includes(safe.code)
                ? 500
                : 400;
    return c.json({ error: safe }, status);
  });
  return app;
}
