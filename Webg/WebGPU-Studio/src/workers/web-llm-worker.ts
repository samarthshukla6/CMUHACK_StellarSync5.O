import { WebWorkerMLCEngineHandler } from "@built-in-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};

self.postMessage({ kind: "ready" });
