"use client";

import { useEffect, useRef } from "react";
import type { MessageStreamEvent } from "@/lib/realtime/sse-hub";

export function useMultiThreadStream(
  threadIds: string[],
  onEvent: (event: MessageStreamEvent) => void,
  enabled = true
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const threadKey = threadIds.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || threadIds.length === 0) return;

    const sources = threadIds.map((threadId) => {
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

      return source;
    });

    return () => {
      sources.forEach((source) => source.close());
    };
  }, [threadKey, enabled, threadIds]);
}
