export type ChatMessage = {
  role: "user" | "assistant" | "tool";
  content: string;
};
