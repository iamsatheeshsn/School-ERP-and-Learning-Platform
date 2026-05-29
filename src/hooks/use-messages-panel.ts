"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  getMessages,
  markThreadRead,
  sendMessage,
} from "@/actions/messages";
import { useMultiThreadStream } from "@/hooks/use-multi-thread-stream";
import type { MessageStreamEvent } from "@/lib/realtime/sse-hub";
import type { AttachmentMeta } from "@/lib/types";

export type ThreadItem = {
  id: string;
  subject: string;
  updatedAt?: string | Date;
  unreadCount?: number;
  student: { user: { name: string } };
  parent?: { user: { name: string } };
  teacher?: { user: { name: string } };
  messages: {
    body: string;
    createdAt: string | Date;
    senderId?: string;
  }[];
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string | Date;
  readAt?: string | Date | null;
  attachments?: AttachmentMeta[];
  sender: { id?: string; name: string; role?: string };
};

type UseMessagesPanelOptions = {
  initialThreads: ThreadItem[];
  currentUserId: string;
};

export function useMessagesPanel({
  initialThreads,
  currentUserId,
}: UseMessagesPanelOptions) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedThread, setSelectedThread] = useState<string | null>(
    initialThreads[0]?.id ?? null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [isPending, startTransition] = useTransition();

  const activeThread = threads.find((t) => t.id === selectedThread);

  const bumpThreadPreview = useCallback(
    (
      threadId: string,
      preview: string,
      createdAt: string,
      senderId?: string,
      incrementUnread = false
    ) => {
      setThreads((prev) => {
        const index = prev.findIndex((t) => t.id === threadId);
        if (index === -1) return prev;

        const thread = prev[index];
        const unreadCount =
          incrementUnread && selectedThread !== threadId
            ? (thread.unreadCount ?? 0) + 1
            : thread.unreadCount ?? 0;

        const updated: ThreadItem = {
          ...thread,
          unreadCount,
          updatedAt: createdAt,
          messages: [{ body: preview, createdAt, senderId }],
        };

        const rest = prev.filter((t) => t.id !== threadId);
        return [updated, ...rest];
      });
    },
    [selectedThread]
  );

  const loadMessages = useCallback(
    (threadId: string) => {
      setSelectedThread(threadId);
      startTransition(async () => {
        const [messagesResult] = await Promise.all([
          getMessages(threadId),
          markThreadRead(threadId),
        ]);

        if (messagesResult.success) {
          setMessages(messagesResult.data as ChatMessage[]);
        }

        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unreadCount: 0 } : t
          )
        );
      });
    },
    []
  );

  useEffect(() => {
    if (initialThreads[0]?.id && messages.length === 0 && selectedThread) {
      loadMessages(selectedThread);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const handleStreamEvent = useCallback(
    (event: MessageStreamEvent) => {
      if (event.type === "message.new") {
        const isIncoming = event.message.sender.id !== currentUserId;

        bumpThreadPreview(
          event.threadId,
          event.message.body,
          event.message.createdAt,
          event.message.sender.id,
          isIncoming
        );

        if (event.threadId === selectedThread) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.message.id)) return prev;
            return [...prev, event.message as ChatMessage];
          });

          if (isIncoming) {
            void markThreadRead(event.threadId);
          }
        }
      }
    },
    [bumpThreadPreview, currentUserId, selectedThread]
  );

  useMultiThreadStream(
    threads.map((t) => t.id),
    handleStreamEvent,
    threads.length > 0
  );

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThread || (!body.trim() && attachments.length === 0)) return;

    startTransition(async () => {
      const result = await sendMessage({
        threadId: selectedThread,
        body: body.trim() || "(attachment)",
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (result.success) {
        toast.success("Message sent");
        setBody("");
        setAttachments([]);
        bumpThreadPreview(
          selectedThread,
          body.trim() || "(attachment)",
          new Date().toISOString(),
          currentUserId,
          false
        );
        const messagesResult = await getMessages(selectedThread);
        if (messagesResult.success) {
          setMessages(messagesResult.data as ChatMessage[]);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return {
    threads,
    activeThread,
    selectedThread,
    messages,
    body,
    setBody,
    attachments,
    setAttachments,
    isPending,
    loadMessages,
    handleSend,
  };
}
