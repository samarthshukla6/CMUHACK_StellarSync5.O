import type { z } from "zod";
import type {
  ModelInventoryItemSchema,
  ModelInventoryResponseSchema,
} from "./schemas.js";
export type ModelInventoryItem = z.infer<typeof ModelInventoryItemSchema>;
export type ModelInventoryResponse = z.infer<
  typeof ModelInventoryResponseSchema
>;
export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";
export interface StorageImageInput {
  buffer: Buffer;
  mimeType: ImageMimeType;
  filename?: string;
}
export interface ProcessedStorageImage {
  buffer: Buffer;
  mimeType: "image/jpeg";
}
export interface AnalyzeStorageContentsInput {
  images: StorageImageInput[];
  currency?: "USD";
  riskMultiplier?: number;
}
export interface StorageInventoryItem extends Omit<
  ModelInventoryItem,
  "suggestedNeedsReview" | "suggestedReviewReason"
> {
  id: string;
  priceSource: "model_estimate";
  needsReview: boolean;
  reviewReasons: string[];
}
export interface ValuationTotals {
  low: number;
  expected: number;
  high: number;
  recommendedInsuredValue: number;
}
export interface PrototypePremium {
  type: "demo_only";
  insuredValue: number;
  baseMonthlyRate: number;
  riskMultiplier: number;
  minimumMonthlyPremium: number;
  monthlyPremium: number;
}
export interface StorageValuationResult {
  status: "auto_quoted" | "provisional";
  currency: "USD";
  imagesAnalyzed: number;
  items: StorageInventoryItem[];
  totals: ValuationTotals;
  premium: PrototypePremium;
  warnings: string[];
  metadata: { provider: string; model: string; analyzedAt: string };
}
