import { NextResponse } from "next/server";
import { getElevenLabsAgentId, getElevenLabsApiKey } from "@/lib/env";

function looksLikeApiKeyId(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

function voiceConfigError(): string | null {
  try {
    getElevenLabsApiKey();
  } catch {
    return "Missing ELEVENLABS_API_KEY in .env.local";
  }

  const agentId = getElevenLabsAgentId();
  if (!agentId) {
    return "Missing Conversational AI agent ID. It starts with agent_ and is on https://elevenlabs.io/app/conversational-ai — not the Key ID from the API keys page.";
  }

  if (looksLikeApiKeyId(agentId) || agentId.startsWith("sk_")) {
    return "That ID is an API key ID, not an agent ID. Open https://elevenlabs.io/app/conversational-ai, create or open an agent, and copy the ID that starts with agent_.";
  }

  return null;
}

export async function GET() {
  const error = voiceConfigError();
  if (error) {
    return NextResponse.json({ ready: false, error }, { status: 200 });
  }

  return NextResponse.json({ ready: true });
}

export async function POST() {
  const configError = voiceConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 400 });
  }

  const apiKey = getElevenLabsApiKey();
  const agentId = getElevenLabsAgentId();
  const url = new URL("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url");
  url.searchParams.set("agent_id", agentId);

  try {
    const res = await fetch(url, {
      headers: { "xi-api-key": apiKey },
      cache: "no-store",
    });

    const data = (await res.json()) as {
      signed_url?: string;
      detail?: { message?: string } | string;
    };

    if (!res.ok || !data.signed_url) {
      const detail = data.detail;
      const message =
        typeof detail === "string"
          ? detail
          : detail?.message || "Failed to create a signed voice session.";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start voice session";
    console.error("[voice-session]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
