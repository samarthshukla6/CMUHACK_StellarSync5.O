/**
 * Shared Transformers.js worker.
 *
 * Same lifecycle rules as the WebLLM worker: create it once, wait until the
 * script actually runs, and never terminate it from a React effect.
 */

import { logger } from "@/lib/utils/logger";

const WORKER_READY_MS = 120_000;

let sharedWorker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let epoch = 0;

function resetWorker() {
  epoch += 1;
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
  workerReady = null;
}

function attachReadyHandshake(worker: Worker, born: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onMessageError);
      fn();
    };

    const fail = (error: Error) => {
      settle(() => {
        if (born === epoch) resetWorker();
        reject(error);
      });
    };

    const timer = setTimeout(() => {
      fail(new Error("The vision worker failed to start. Reload the page and try again."));
    }, WORKER_READY_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.kind === "ready") settle(resolve);
    };
    const onError = (event: ErrorEvent) => {
      fail(event.error instanceof Error ? event.error : new Error(event.message || "Vision worker crashed while starting."));
    };
    const onMessageError = () => {
      fail(new Error("Vision worker received an unreadable message."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
  });
}

export function getTransformersJSWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (sharedWorker) return sharedWorker;

  const born = epoch;
  const worker = new Worker(new URL("../../workers/transformers-js-worker.ts", import.meta.url), {
    type: "module",
    name: "webgpu-transformers",
  });

  sharedWorker = worker;
  workerReady = attachReadyHandshake(worker, born)
    .then(() => {
      worker.addEventListener("error", (event) => {
        logger.error("Transformers.js worker error:", event.message);
        if (born === epoch) resetWorker();
      });
    })
    .catch((error) => {
      logger.error("Transformers.js worker handshake failed:", error);
      throw error;
    });
  return worker;
}

export async function ensureTransformersJSWorker(): Promise<Worker> {
  const worker = getTransformersJSWorker();
  if (!worker || !workerReady) {
    throw new Error("WebGPU is not available in this browser.");
  }
  await workerReady;
  return worker;
}

export function bootTransformersRuntime(): void {
  if (typeof window === "undefined") return;
  getTransformersJSWorker();
}
