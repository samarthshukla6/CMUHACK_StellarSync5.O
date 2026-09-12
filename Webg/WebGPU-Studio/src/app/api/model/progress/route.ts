import { MODEL_PRESETS } from "@/lib/ai/models";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const { modelId } = body as { modelId?: string };

  // Dynamic import to prevent bundling large transformers.js package
  // This loads the package at runtime instead of bundling it, reducing serverless function size
  const { transformersJS } = await import("@built-in-ai/transformers-js");
  const preset = MODEL_PRESETS.find((p) => p.id === modelId) ?? MODEL_PRESETS[0];
  const model = transformersJS(preset.modelId, {
    isVisionModel: preset.isVision ?? false,
    device: "cpu",
  });

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      const availability = await model.availability();
      if (availability === "available") {
        await writer.write(new TextEncoder().encode("100\n"));
        await writer.close();
        return;
      }
      await model.createSessionWithProgress?.(({ progress }) => {
        const pct = Math.round(progress * 100);
        void writer.write(new TextEncoder().encode(`${pct}\n`));
      });
      await writer.write(new TextEncoder().encode("100\n"));
      await writer.close();
    } catch (err) {
      await writer.abort(err);
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
