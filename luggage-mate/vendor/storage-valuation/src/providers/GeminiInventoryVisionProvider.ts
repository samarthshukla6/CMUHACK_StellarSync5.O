import { travelerInventoryInstruction } from "../prompts/travelerInventoryPrompt.js";
import { geminiInventoryJsonSchema } from "./geminiSchema.js";
import { GoogleGenAI } from "@google/genai";
import type {
  InventoryVisionProvider,
  InventoryAnalysisContext,
} from "./InventoryVisionProvider.js";
import type {
  ProcessedStorageImage,
  ModelInventoryResponse,
} from "../domain/types.js";
import { StorageAnalysisError } from "../domain/errors.js";
import { validateModelResponse } from "../domain/schemas.js";
import {
  storageInventoryPrompt,
  quantityInstruction,
} from "../prompts/storageInventoryPrompt.js";
export interface GeminiRequest {
  model: string;
  system_instruction: string;
  store: false;
  stream: false;
  input: (
    | { type: "text"; text: string }
    | { type: "image"; data: string; mime_type: "image/jpeg" }
  )[];
  response_format: {
    type: "text";
    mime_type: "application/json";
    schema: Record<string, unknown>;
  };
  generation_config: { thinking_level: "low" };
}
export type GeminiTransport = (request: GeminiRequest) => Promise<unknown>;
export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  transport?: GeminiTransport;
  sleep?: (ms: number) => Promise<void>;
}
function isTransient(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const status = Number(record.status ?? record.statusCode);
  if (status === 429 || (status >= 500 && status <= 599)) return true;
  return (
    ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN"].includes(
      String(record.code),
    ) ||
    ["ConnectionError", "RequestTimeoutError"].includes(String(record.name)) ||
    (error instanceof TypeError && /fetch failed|network/i.test(error.message))
  );
}
export class GeminiInventoryVisionProvider implements InventoryVisionProvider {
  readonly metadata: { provider: "gemini"; model: string };
  private readonly transport: GeminiTransport;
  private readonly sleep: (ms: number) => Promise<void>;
  constructor(options: GeminiProviderOptions = {}) {
    this.metadata = {
      provider: "gemini",
      model: options.model ?? process.env.GEMINI_MODEL ?? "gemini-3.8-flash",
    };
    this.sleep =
      options.sleep ??
      ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    if (options.transport) this.transport = options.transport;
    else {
      const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
      if (!apiKey?.trim())
        throw new StorageAnalysisError(
          "AI_PROVIDER_ERROR",
          "Gemini is not configured. Set GEMINI_API_KEY on the server.",
        );
      const client = new GoogleGenAI({ apiKey });
      this.transport = (request) =>
        client.interactions.create(request, {
          timeout_ms: 45000,
          retries: { strategy: "none" },
        });
    }
  }
  async analyze(
    images: ProcessedStorageImage[],
    context?: InventoryAnalysisContext,
  ): Promise<ModelInventoryResponse> {
    const request: GeminiRequest = {
      model: this.metadata.model,
      system_instruction:
        storageInventoryPrompt +
        (context ? "\n\n" + travelerInventoryInstruction(context) : ""),
      store: false,
      stream: false,
      input: [
        { type: "text", text: quantityInstruction },
        ...images.map((image) => ({
          type: "image" as const,
          data: image.buffer.toString("base64"),
          mime_type: image.mimeType,
        })),
      ],
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: geminiInventoryJsonSchema,
      },
      generation_config: { thinking_level: "low" },
    };
    let response: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await this.transport(request);
        break;
      } catch (cause) {
        if (attempt < 2 && isTransient(cause)) {
          await this.sleep(250 * 2 ** attempt);
          continue;
        }
        throw new StorageAnalysisError(
          "AI_PROVIDER_ERROR",
          "Gemini inventory analysis failed. Check server configuration or try again later.",
          { cause },
        );
      }
    }
    if (!response || typeof response !== "object")
      throw new StorageAnalysisError(
        "EMPTY_AI_RESPONSE",
        "Gemini returned no inventory.",
      );
    const record = response as Record<string, unknown>;
    if (record.status !== undefined && record.status !== "completed")
      throw new StorageAnalysisError(
        "AI_PROVIDER_ERROR",
        "Gemini could not complete the inventory analysis.",
      );
    const text = record.output_text;
    if (typeof text !== "string" || !text.trim())
      throw new StorageAnalysisError(
        "EMPTY_AI_RESPONSE",
        "Gemini returned no identifiable inventory.",
      );
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new StorageAnalysisError(
        "INVALID_AI_RESPONSE",
        "Gemini returned invalid structured data.",
        { cause },
      );
    }
    return validateModelResponse(parsed);
  }
}
