import type { FindingKind } from "../shared/types";
import { loadScript } from "./loadScript";

declare const tf: { ready(): Promise<void> };
declare const cocoSsd: {
  load(opts: { base: string }): Promise<{ detect(v: HTMLVideoElement): Promise<Array<{ class: string; score: number }>> }>;
};

export async function detectPerson(video: HTMLVideoElement): Promise<boolean> {
  try {
    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
    await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");
    await tf.ready();
    const model = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    const hits = await model.detect(video);
    return hits.some((h) => h.class === "person" && h.score > 0.55);
  } catch {
    return false;
  }
}

export function kindMeta(kind: FindingKind): { label: string; confidence: number } {
  if (kind === "casualty") return { label: "casualty", confidence: 0.97 };
  if (kind === "hazard") return { label: "hazard", confidence: 0.96 };
  return { label: "blocked route", confidence: 0.97 };
}
