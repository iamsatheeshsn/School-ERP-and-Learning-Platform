import { z } from "zod";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiProvider = {
  completeText(system: string, userMessage: string, maxTokens?: number): Promise<string>;
  streamChat(
    system: string,
    messages: ChatMessage[]
  ): AsyncGenerator<string, void, unknown>;
};

export function parseJsonFromText<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(cleaned);
  return schema.parse(parsed);
}
