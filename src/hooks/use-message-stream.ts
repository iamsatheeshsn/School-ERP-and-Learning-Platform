"use client";

import { useEffect, useRef } from "react";
import type { MessageStreamEvent } from "@/lib/realtime/sse-hub";

export function useMessageStream(
  threadId: string | null,
  onEvent: (event: MessageStreamEvent) => void,
  enabled = true
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !threadId) return;

    const url = `/api/messages/stream?threadId=${encodeURIComponent(threadId)}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as MessageStreamEvent;
        onEventRef.current(data);
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [threadId, enabled]);
}
