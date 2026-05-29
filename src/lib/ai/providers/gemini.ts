import {
  GoogleGenerativeAI,
  type Content,
  type GenerativeModel,
} from "@google/generative-ai";
import type { AiProvider, ChatMessage } from "@/lib/ai/types";

const DEFAULT_MODEL = "gemini-2.0-flash";

function getModel(system: string): GenerativeModel {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    systemInstruction: system,
  });
}

function toGeminiHistory(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

export const geminiProvider: AiProvider = {
  async completeText(system, userMessage, maxTokens = 2048) {
    const model = getModel(system);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    const text = result.response.text();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
  },

  async *streamChat(system, messages) {
    const model = getModel(system);

    if (messages.length === 0) return;

    if (messages.length === 1) {
      const stream = await model.generateContentStream(messages[0]!.content);
      for await (const chunk of stream.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
      return;
    }

    const history = toGeminiHistory(messages.slice(0, -1));
    const last = messages[messages.length - 1]!;
    const chat = model.startChat({ history });
    const stream = await chat.sendMessageStream(last.content);
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  },
};

export { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL };
