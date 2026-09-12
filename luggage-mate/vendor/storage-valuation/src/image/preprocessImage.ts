import sharp from "sharp";
import { StorageAnalysisError } from "../domain/errors.js";
import type {
  StorageImageInput,
  ProcessedStorageImage,
} from "../domain/types.js";
export async function preprocessImage(
  image: StorageImageInput,
): Promise<ProcessedStorageImage> {
  try {
    const pipeline = sharp(image.buffer, {
      failOn: "warning",
      limitInputPixels: 100_000_000,
    });
    const metadata = await pipeline.metadata();
    const expected = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    }[image.mimeType];
    if (metadata.format !== expected || (metadata.pages ?? 1) > 1)
      throw new Error("Mismatched format or animated image");
    const buffer = await pipeline
      .rotate()
      .resize({
        width: 2048,
        height: 2048,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92 })
      .toBuffer();
    return { buffer, mimeType: "image/jpeg" };
  } catch (cause) {
    throw new StorageAnalysisError(
      "INVALID_IMAGE",
      "An image could not be decoded as a supported still image.",
      { cause },
    );
  }
}
