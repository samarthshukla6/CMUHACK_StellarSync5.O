interface AssistantOptions {
  firstMessage?: string;
  model?: { messages?: { role: string; content: string }[] };
}

export function buildSessionContext(assistantOptions?: AssistantOptions): string {
  const systemPrompt =
    assistantOptions?.model?.messages?.find((m) => m.role === "system")?.content ?? "";
  const firstMessage = assistantOptions?.firstMessage ?? "";

  const parts = ["SESSION INSTRUCTIONS — follow these for this trip planning call:", systemPrompt];

  if (firstMessage) {
    parts.push(
      `Open the conversation by saying exactly: "${firstMessage}"`,
      "Then continue with the questions above, one at a time."
    );
  }

  return parts.filter(Boolean).join("\n\n");
}
