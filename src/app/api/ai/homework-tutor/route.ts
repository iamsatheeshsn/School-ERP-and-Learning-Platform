import { auth } from "@/lib/auth";
import { checkRateLimit, streamChatText } from "@/lib/ai/client";
import { HOMEWORK_TUTOR_SYSTEM } from "@/lib/ai/prompts";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!checkRateLimit(`tutor:${session.user.id}`)) {
    return new Response("Rate limit exceeded", { status: 429 });
  }

  const body = await req.json();
  const { homeworkId, messages } = body as {
    homeworkId: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!homeworkId || !Array.isArray(messages)) {
    return new Response("Invalid request", { status: 400 });
  }

  const homework = await db.homework.findUnique({
    where: { id: homeworkId },
    include: {
      subject: { select: { name: true } },
      class: {
        include: {
          students: {
            where: { userId: session.user.id },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!homework || homework.class.students.length === 0) {
    return new Response("Homework not found", { status: 404 });
  }

  const system = HOMEWORK_TUTOR_SYSTEM({
    title: homework.title,
    description: homework.description,
    subject: homework.subject.name,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamChatText(system, messages)) {
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
