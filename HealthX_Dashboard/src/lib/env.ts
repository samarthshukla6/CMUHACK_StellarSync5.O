function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
}

export function getGeminiApiKey(): string {
  return requireEnv("GEMINI_API_KEY");
}

export function getElevenLabsApiKey(): string {
  return requireEnv("ELEVENLABS_API_KEY");
}

export function getElevenLabsAgentId(): string {
  return (
    process.env.ELEVENLABS_AGENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID?.trim() ||
    ""
  );
}

export function getGeminiModelCandidates(): string[] {
  return [process.env.GEMINI_MODEL, "gemini-3.6-flash", "gemini-flash-latest"].filter(
    (m): m is string => Boolean(m?.trim())
  );
}
