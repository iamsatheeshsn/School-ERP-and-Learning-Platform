export type MessageStreamEvent =
  | {
      type: "message.new";
      threadId: string;
      message: {
        id: string;
        body: string;
        createdAt: string;
        sender: { id: string; name: string; role: string };
        attachments?: { url: string; name: string; size?: number; type?: string }[];
      };
    }
  | { type: "thread.updated"; threadId: string };

type Listener = (event: MessageStreamEvent) => void;

const threadListeners = new Map<string, Set<Listener>>();

export function subscribeToThread(threadId: string, listener: Listener) {
  let set = threadListeners.get(threadId);
  if (!set) {
    set = new Set();
    threadListeners.set(threadId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set?.size === 0) threadListeners.delete(threadId);
  };
}

export function publishThreadEvent(threadId: string, event: MessageStreamEvent) {
  threadListeners.get(threadId)?.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // ignore listener errors
    }
  });
}

export const SSE_HEARTBEAT_MS = 25_000;
