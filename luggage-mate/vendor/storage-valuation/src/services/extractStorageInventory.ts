import type { AnalyzeStorageContentsInput } from "../domain/types.js";
import type { InventoryAnalysisContext } from "../providers/InventoryVisionProvider.js";
import type { AnalyzeStorageContentsDependencies } from "./analyzeStorageContents.js";
import { GeminiInventoryVisionProvider } from "../providers/GeminiInventoryVisionProvider.js";
import { StorageAnalysisError } from "../domain/errors.js";
import { validateModelResponse } from "../domain/schemas.js";
import { validateImages } from "../image/validateImage.js";
import { preprocessImage } from "../image/preprocessImage.js";
export async function extractStorageInventory(
  input: Pick<AnalyzeStorageContentsInput, "images" | "currency">,
  dependencies: AnalyzeStorageContentsDependencies = {},
  context?: InventoryAnalysisContext,
) {
  validateImages(input?.images, dependencies.maxImageBytes);
  if (input.currency !== undefined && input.currency !== "USD")
    throw new StorageAnalysisError(
      "UNSUPPORTED_CURRENCY",
      "Only USD is supported.",
    );
  const images = await Promise.all(input.images.map(preprocessImage));
  const provider = dependencies.provider ?? new GeminiInventoryVisionProvider();
  let raw: unknown;
  try {
    raw = await provider.analyze(images, context);
  } catch (cause) {
    if (cause instanceof StorageAnalysisError) throw cause;
    throw new StorageAnalysisError(
      "AI_PROVIDER_ERROR",
      "Inventory analysis is temporarily unavailable.",
      { cause },
    );
  }
  return {
    inventory: validateModelResponse(raw),
    imagesAnalyzed: images.length,
    metadata: {
      ...(provider.metadata ?? { provider: "custom", model: "unspecified" }),
      analyzedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    },
  };
}
