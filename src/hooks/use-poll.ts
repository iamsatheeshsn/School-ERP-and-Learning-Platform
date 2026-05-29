"use client";

import { useEffect, useRef } from "react";

export function usePoll(
  callback: () => void,
  intervalMs: number,
  enabled = true
) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => saved.current(), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
