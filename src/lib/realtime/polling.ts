/** Realtime messaging via SSE — see /api/messages/stream */
export const SSE_HEARTBEAT_MS = 25_000;

/** @deprecated Use SSE; kept as fallback interval if needed */
export const POLL_INTERVAL_MS = 10_000;

export function threadChannel(threadId: string) {
  return `thread:${threadId}`;
}

export function notificationChannel(userId: string) {
  return `notifications:${userId}`;
}
