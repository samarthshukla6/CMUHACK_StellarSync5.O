import {GeminiInventoryVisionProvider} from '../vendor/storage-valuation/dist/providers/GeminiInventoryVisionProvider.js';
import {extractStorageInventory} from '../vendor/storage-valuation/dist/services/extractStorageInventory.js';
import {postProcessInventory} from '../vendor/storage-valuation/dist/services/postProcessInventory.js';
import {aggregateValuation} from '../vendor/storage-valuation/dist/services/valuation.js';

// Reuse the teammate's extraction, traveler prompt, validation and valuation.
// The separate insurance-quote engine is not used: the product keeps its three protection choices.
export async function analyzePhotos(files, dependencies={}) {
  const extracted=await extractStorageInventory({images:files.map(file=>({buffer:file.buffer,mimeType:file.mimetype})),currency:'USD'},{provider:dependencies.provider??new GeminiInventoryVisionProvider({model:process.env.GEMINI_MODEL||'gemini-3.5-flash-lite'}),...dependencies,maxImageBytes:25*1024*1024},{useCase:'traveler_storage',coverageScope:'bag_and_contents',photoCoverage:'visible_contents'});
  const items=postProcessInventory(extracted.inventory.items);
  const totals=aggregateValuation(items);
  if(totals.expected>1000000)throw new Error('VALUATION_LIMIT');
  return {items,estimatedValue:{low:totals.low,expected:totals.expected,high:totals.high},imagesAnalyzed:extracted.imagesAnalyzed,metadata:extracted.metadata};
}
export function reviewedAnalysis(record, input) {
  if(!record||input.reviewed!==true||!Array.isArray(input.includedItemIds)||!input.includedItemIds.length)throw new Error('Review your photo inventory before booking.');
  const ids=input.includedItemIds;
  if(new Set(ids).size!==ids.length||ids.some(id=>!record.items.some(item=>item.id===id)))throw new Error('Choose valid items from your photo inventory.');
  return {analysisId:record._id,items:record.items.filter(item=>ids.includes(item.id)),estimatedValue:aggregateValuation(record.items.filter(item=>ids.includes(item.id))),metadata:record.metadata,imagesAnalyzed:record.imagesAnalyzed,reviewed:true};
}
