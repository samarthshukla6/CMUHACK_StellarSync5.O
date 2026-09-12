/**
 * Shared WebLLM runtime.
 *
 * The worker and engine live at module scope so they survive Strict Mode remounts
 * and Fast Refresh. Owning either in a React effect is what made the first chat
 * hang: the worker was terminated mid-init and never replied.
 *
 * Only one MLC engine may own a given worker. Creating a second engine overwrites
 * `worker.onmessage` and the first engine's reload never settles.
 */

import { doesBrowserSupportWebLLM, webLLM, type WebLLMProgress } from "@built-in-ai/web-llm";
import { logger } from "@/lib/utils/logger";

type WebLLMModel = ReturnType<typeof webLLM>;
type ProgressCb = (progress: WebLLMProgress) => void;

/** First webpack compile of @mlc-ai/web-llm as a module worker is large. */
const WORKER_READY_MS = 120_000;
/** After the worker is alive, silence this long means it died. */
const STALL_MS = 90_000;

let sharedWorker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let sessionEpoch = 0;

const modelsById = new Map<string, WebLLMModel>();
const progressListeners = new Set<ProgressCb>();

let inflight: { modelId: string; epoch: number; promise: Promise<WebLLMModel> } | null = null;
let abortLoad: ((error: Error) => void) | null = null;

function emitProgress(progress: WebLLMProgress) {
  for (const listener of progressListeners) {
    listener(progress);
  }
}

function resetSession(error?: Error) {
  abortLoad?.(error ?? new Error("WebGPU worker stopped."));
  abortLoad = null;
  sessionEpoch += 1;
  inflight = null;
  modelsById.clear();
  if (sharedWorker) {
    sharedWorker.terminate();
    sharedWorker = null;
  }
  workerReady = null;
}

function attachReadyHandshake(worker: Worker, epoch: number): Promise<void> {
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
        if (epoch === sessionEpoch) resetSession();
        reject(error);
      });
    };

    const timer = setTimeout(() => {
      fail(new Error("The WebGPU worker failed to start. Reload the page and try again."));
    }, WORKER_READY_MS);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.kind === "ready") settle(resolve);
    };
    const onError = (event: ErrorEvent) => {
      fail(event.error instanceof Error ? event.error : new Error(event.message || "WebGPU worker crashed while starting."));
    };
    const onMessageError = () => {
      fail(new Error("WebGPU worker received an unreadable message."));
    };

    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onMessageError);
  });
}

export function getWebLLMWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (sharedWorker) return sharedWorker;

  const epoch = sessionEpoch;
  const worker = new Worker(new URL("../../workers/web-llm-worker.ts", import.meta.url), {
    type: "module",
    name: "webgpu-webllm",
  });

  sharedWorker = worker;
  workerReady = attachReadyHandshake(worker, epoch)
    .then(() => {
      worker.addEventListener("error", (event) => {
        logger.error("WebLLM worker error:", event.message);
        if (epoch === sessionEpoch) {
          resetSession(
            event.error instanceof Error
              ? event.error
              : new Error(event.message || "WebGPU worker crashed."),
          );
        }
      });
    })
    .catch((error) => {
      logger.error("WebLLM worker handshake failed:", error);
      throw error;
    });
  return worker;
}

async function ensureWorkerReady(): Promise<Worker> {
  const worker = getWebLLMWorker();
  if (!worker || !workerReady) {
    throw new Error("WebGPU is not available in this browser.");
  }
  await workerReady;
  return worker;
}

export function getWebLLMModel(modelId: string): WebLLMModel {
  const cached = modelsById.get(modelId);
  if (cached) return cached;

  const model = webLLM(modelId, { worker: getWebLLMWorker() ?? undefined });
  modelsById.set(modelId, model);
  return model;
}

export function isWebLLMReady(modelId: string): boolean {
  return modelsById.get(modelId)?.isModelInitialized === true;
}

export function evictWebLLMModel(modelId: string): void {
  modelsById.delete(modelId);
  if (inflight?.modelId === modelId) {
    resetSession();
  }
}

/**
 * Load (or reuse) a model. Concurrent callers for the same id share one init.
 * A switch to a different id cancels the in-flight load by recycling the worker.
 */
export function prepareWebLLMSession(
  modelId: string,
  onProgress?: ProgressCb,
): Promise<WebLLMModel> {
  if (onProgress) progressListeners.add(onProgress);
  const release = () => {
    if (onProgress) progressListeners.delete(onProgress);
  };

  return loadModel(modelId).finally(release);
}

function loadModel(modelId: string): Promise<WebLLMModel> {
  const cached = modelsById.get(modelId);
  if (cached?.isModelInitialized) return Promise.resolve(cached);

  if (inflight?.modelId === modelId) return inflight.promise;

  const otherEngineOwnsWorker =
    inflight != null ||
    [...modelsById.values()].some((model) => model.isModelInitialized);
  if (otherEngineOwnsWorker) resetSession();

  const epoch = sessionEpoch;
  const promise = (async () => {
    await ensureWorkerReady();
    if (epoch !== sessionEpoch) {
      throw new Error("Model load was cancelled.");
    }

    const model = getWebLLMModel(modelId);
    if (model.isModelInitialized) return model;

    let stallTimer: ReturnType<typeof setTimeout> | undefined;
    let rejectStall: ((error: Error) => void) | undefined;

    const armStall = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        rejectStall?.(
          new Error("Model loading stalled: the background worker stopped responding. Reload the page and try again."),
        );
      }, STALL_MS);
    };

    const stalled = new Promise<never>((_, reject) => {
      rejectStall = reject;
    });
    const cancelled = new Promise<never>((_, reject) => {
      abortLoad = reject;
    });

    armStall();
    const onProgressKeepAlive: ProgressCb = () => armStall();
    const unarm = () => {
      progressListeners.delete(onProgressKeepAlive);
      clearTimeout(stallTimer);
      abortLoad = null;
    };
    progressListeners.add(onProgressKeepAlive);

    try {
      await Promise.race([
        model.createSessionWithProgress((progress) => {
          emitProgress(progress);
        }),
        stalled,
        cancelled,
      ]);
      return model;
    } catch (error) {
      abortLoad = null;
      if (epoch === sessionEpoch) resetSession();
      throw error;
    } finally {
      unarm();
    }
  })();

  inflight = { modelId, epoch, promise };
  return promise.finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
}

/** Start the worker immediately; kick off a silent download of `modelId` once it is alive. */
export function bootWebLLMRuntime(modelId?: string): void {
  if (typeof window === "undefined") return;
  if (!doesBrowserSupportWebLLM()) return;
  getWebLLMWorker();
  if (!modelId) return;
  void prepareWebLLMSession(modelId).catch((error) => {
    logger.warn("Background model warmup failed:", error);
  });
}
