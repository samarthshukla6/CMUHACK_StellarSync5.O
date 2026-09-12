import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { StorageAnalysisError } from "../domain/errors.js";
import { DEFAULT_MAX_IMAGE_BYTES } from "../image/validateImage.js";
import type { StorageImageInput, ImageMimeType } from "../domain/types.js";
export async function loadImages(
  paths: string[],
): Promise<StorageImageInput[]> {
  if (!paths.length)
    throw new StorageAnalysisError(
      "NO_IMAGES",
      "Supply at least one image path.",
    );
  if (paths.length > 5)
    throw new StorageAnalysisError(
      "TOO_MANY_IMAGES",
      "Supply no more than five image paths.",
    );
  return Promise.all(
    paths.map(async (path) => {
      const mimeType = (
        {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".webp": "image/webp",
        } as Record<string, ImageMimeType>
      )[extname(path).toLowerCase()];
      if (!mimeType)
        throw new StorageAnalysisError(
          "UNSUPPORTED_IMAGE_TYPE",
          "Use JPEG, PNG, or WebP files.",
        );
      try {
        const info = await stat(path);
        if (info.size > DEFAULT_MAX_IMAGE_BYTES)
          throw new StorageAnalysisError(
            "IMAGE_TOO_LARGE",
            "An image exceeds the size limit.",
          );
        return { buffer: await readFile(path), mimeType };
      } catch (cause) {
        if (cause instanceof StorageAnalysisError) throw cause;
        throw new StorageAnalysisError(
          "INVALID_IMAGE",
          "An image file could not be read.",
          { cause },
        );
      }
    }),
  );
}
