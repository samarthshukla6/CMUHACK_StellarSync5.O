import type { InventoryAnalysisContext } from "../providers/InventoryVisionProvider.js";
export function travelerInventoryInstruction(
  context: InventoryAnalysisContext,
): string {
  return `This request is for a traveler temporarily storing luggage. Draft an inventory for traveler confirmation; do not issue a quote or policy.
Coverage scope: ${context.coverageScope}. Photo coverage declared by the traveler: ${context.photoCoverage}.
Only identify bags and belongings presented for storage. Exclude clothing being worn by people, people themselves, furniture, floors and background scenery. Clothing laid out as luggage contents may be included when scope is bag_and_contents.
When scope is bag_only, return only the bag(s), not loose contents. Never infer anything inside a closed bag, including electronics, clothing or valuables. A photo of a bag exterior is not evidence of its contents. All views depict the same collection; deduplicate accordingly.
For a clearly branded inexpensive everyday watch, do not suggest review solely because it is a watch. Continue to flag luxury watches, uncertain authenticity, high potential value and materially uncertain identity. Do not claim authenticity from an image.
Follow the provided inventory schema and unit-value instructions. User confirmation and deterministic eligibility rules run outside the model.`;
}
