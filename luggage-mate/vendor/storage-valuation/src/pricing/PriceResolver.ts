import type { ModelInventoryItem } from "../domain/types.js";
export interface ResolvedPrice {
  replacementValue: ModelInventoryItem["replacementValue"];
  currency: "USD";
  source: string;
  retrievedAt: string;
}
// Future extension only: V1 deliberately never calls a resolver or claims verified prices.
export interface PriceResolver {
  resolvePrice(item: ModelInventoryItem): Promise<ResolvedPrice | null>;
}
