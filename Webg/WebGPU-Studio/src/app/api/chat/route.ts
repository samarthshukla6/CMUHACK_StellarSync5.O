import { streamText } from "ai";
import { MODEL_PRESETS, buildDomainSystemPrompt } from "@/lib/ai/models";

export const runtime = "nodejs";

/**
 * Converts a data URL (base64 encoded image) to a Uint8Array.
 * This is needed because transformers.js in Node.js expects Buffer/Uint8Array,
 * not data URL strings. Uint8Array is used instead of Buffer to avoid
 * serialization issues that can cause stack overflow errors.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  // Data URL format: data:image/{type};base64,{base64data}
  const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/);
  if (!base64Match) {
    throw new Error("Invalid data URL format");
  }
  const base64Data = base64Match[1];
  const buffer = Buffer.from(base64Data, "base64");
  return new Uint8Array(buffer);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, modelId, systemPrompt } = body as {
    messages: Array<{
      role: "user" | "assistant" | "tool";
      content: string | Array<{ type: string; text?: string; image?: string }>;
    }>;
    modelId?: string;
    systemPrompt?: string;
  };

  const preset = MODEL_PRESETS.find((p) => p.id === modelId) ?? MODEL_PRESETS[0];

  if (preset.isVision) {
    const hasImage = (messages ?? []).some((m) =>
      Array.isArray(m.content) &&
      m.content.some((part: { type?: string; image?: string }) => part?.type === "image" && part?.image),
    );
    if (!hasImage) {
      return new Response("Image required for vision model.", { status: 400 });
    }
  }

  // Dynamic import to prevent bundling large transformers.js package
  // This loads the package at runtime instead of bundling it, reducing serverless function size
  const { transformersJS } = await import("@built-in-ai/transformers-js");
  const model = transformersJS(preset.modelId, {
    isVisionModel: preset.isVision ?? false,
    device: "cpu", // stabilize server inference (avoid WebGPU shape issues)
  });

  const system = systemPrompt?.trim()?.length
    ? systemPrompt
    : buildDomainSystemPrompt(preset.domain, preset.isVision);

  // Transform messages: convert data URLs in image content to Uint8Array for Node.js
  const transformedMessages = messages.map((message) => {
    // Only process messages with array content (vision model messages)
    if (Array.isArray(message.content)) {
      return {
        ...message,
        content: message.content.map((part) => {
          // If this is an image part with a data URL, convert to Uint8Array
          if (part.type === "image" && part.image && typeof part.image === "string" && part.image.startsWith("data:")) {
            return {
              ...part,
              image: dataUrlToUint8Array(part.image),
            };
          }
          return part;
        }),
      };
    }
    return message;
  });

  const result = streamText({
    model,
    system,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: transformedMessages as any,
  });

  // Stream plain text chunks back to the client
  return result.toTextStreamResponse();
}

