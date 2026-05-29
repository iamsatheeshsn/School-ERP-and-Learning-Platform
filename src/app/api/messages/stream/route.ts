import { auth } from "@/lib/auth";
import { assertThreadAccess } from "@/lib/queries/messages";
import { SSE_HEARTBEAT_MS, subscribeToThread } from "@/lib/realtime/sse-hub";
import type { MessageStreamEvent } from "@/lib/realtime/sse-hub";
import type { SessionUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const threadId = new URL(req.url).searchParams.get("threadId");
  if (!threadId) {
    return new Response("threadId required", { status: 400 });
  }

  try {
    await assertThreadAccess(session.user as SessionUser, threadId);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: MessageStreamEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      send({ type: "thread.updated", threadId });

      const unsubscribe = subscribeToThread(threadId, send);

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, SSE_HEARTBEAT_MS);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
