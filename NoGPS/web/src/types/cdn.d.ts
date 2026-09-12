declare module "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/+esm" {
  export function ready(): Promise<void>;
}

declare module "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/+esm" {
  export function load(opts?: { base?: string }): Promise<{
    detect: (input: HTMLVideoElement) => Promise<Array<{ class: string; score: number }>>;
  }>;
}
