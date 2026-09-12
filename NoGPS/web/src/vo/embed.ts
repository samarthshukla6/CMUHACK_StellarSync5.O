// Turns a camera frame into a unit vector so it can be compared, by content,
// against frames captured while recording a path (see server/store.py's
// match_embedding). Loaded lazily so the tracker boots instantly and only
// pays this cost once someone actually records or walks a route.
import { loadScript } from "./loadScript";

declare const tf: {
  ready(): Promise<void>;
};
declare const mobilenet: {
  load(opts: { version: number; alpha: number }): Promise<MobilenetModel>;
};

interface MobilenetModel {
  infer(input: HTMLVideoElement, embedding: true): { data(): Promise<Float32Array>; dispose(): void };
}

let modelPromise: Promise<MobilenetModel | null> | null = null;

async function loadModel(): Promise<MobilenetModel | null> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js");
        await tf.ready();
        return await mobilenet.load({ version: 2, alpha: 1.0 });
      } catch {
        return null;
      }
    })();
  }
  return modelPromise;
}

export async function ready(): Promise<boolean> {
  return (await loadModel()) !== null;
}

export async function embedFrame(video: HTMLVideoElement): Promise<number[] | null> {
  if (video.readyState < 2) return null;
  const model = await loadModel();
  if (!model) return null;
  try {
    const tensor = model.infer(video, true);
    const data = await tensor.data();
    tensor.dispose();
    let norm = 0;
    for (let i = 0; i < data.length; i++) norm += data[i] * data[i];
    norm = Math.sqrt(norm) || 1;
    const out = new Array(data.length);
    for (let i = 0; i < data.length; i++) out[i] = data[i] / norm;
    return out;
  } catch {
    return null;
  }
}
