import type {
  ProcessedStorageImage,
  ModelInventoryResponse,
} from "../domain/types.js";
export interface InventoryAnalysisContext {
  useCase: "traveler_storage";
  coverageScope: "bag_only" | "bag_and_contents";
  photoCoverage: "bag_exterior_only" | "visible_contents";
}
export interface InventoryVisionProvider {
  readonly metadata?: { provider: string; model: string };
  analyze(
    images: ProcessedStorageImage[],
    context?: InventoryAnalysisContext,
  ): Promise<ModelInventoryResponse>;
}
