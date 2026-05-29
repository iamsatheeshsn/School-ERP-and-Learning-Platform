import { z } from "zod";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { parseJsonFromText, type ChatMessage } from "@/lib/ai/types";

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

const provider = geminiProvider;

export function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function completeText(
  system: string,
  userMessage: string,
  maxTokens = 2048
): Promise<string> {
  return provider.completeText(system, userMessage, maxTokens);
}

export async function completeJson<T>(
  system: string,
  userMessage: string,
  schema: z.ZodType<T>,
  maxTokens = 2048
): Promise<T> {
  const text = await provider.completeText(
    `${system}\n\nRespond with valid JSON only. No markdown fences.`,
    userMessage,
    maxTokens
  );
  return parseJsonFromText(text, schema);
}

export async function* streamChatText(
  system: string,
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  yield* provider.streamChat(system, messages);
}

export const AI_MODEL =
  process.env.GEMINI_MODEL ?? process.env.AI_MODEL ?? "gemini-2.0-flash";
