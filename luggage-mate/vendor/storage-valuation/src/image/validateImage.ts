import { StorageAnalysisError } from "../domain/errors.js";
import type { StorageImageInput } from "../domain/types.js";
export const DEFAULT_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export function validateImages(
  images: StorageImageInput[],
  maxBytes = DEFAULT_MAX_IMAGE_BYTES,
) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0)
    throw new StorageAnalysisError(
      "INVALID_CONFIGURATION",
      "Image size limit must be a positive integer.",
    );
  if (!Array.isArray(images) || !images.length)
    throw new StorageAnalysisError("NO_IMAGES", "Supply at least one image.");
  if (images.length > 5)
    throw new StorageAnalysisError(
      "TOO_MANY_IMAGES",
      "Supply no more than five images.",
    );
  for (const image of images) {
    if (
      !image ||
      !["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)
    )
      throw new StorageAnalysisError(
        "UNSUPPORTED_IMAGE_TYPE",
        "Use JPEG, PNG, or WebP images.",
      );
    if (!Buffer.isBuffer(image.buffer) || !image.buffer.length)
      throw new StorageAnalysisError(
        "INVALID_IMAGE",
        "An image is empty or invalid.",
      );
    if (image.buffer.length > maxBytes)
      throw new StorageAnalysisError(
        "IMAGE_TOO_LARGE",
        "An image exceeds the configured size limit.",
      );
  }
}
