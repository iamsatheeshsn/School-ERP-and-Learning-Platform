"use client";

import { format } from "date-fns";
import { Paperclip } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/hooks/use-messages-panel";
import type { AttachmentMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

type MessageListProps = {
  messages: ChatMessage[];
  currentUserId: string;
  emptyLabel?: string;
  className?: string;
};

function AttachmentLinks({ attachments }: { attachments: AttachmentMeta[] }) {
  if (attachments.length === 0) return null;

  return (
    <ul className="mt-1.5 space-y-1">
      {attachments.map((file, i) => (
        <li key={`${file.url}-${i}`}>
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-background/60 px-2 py-1 text-xs text-primary hover:underline"
          >
            <Paperclip className="size-3 shrink-0" />
            <span className="truncate">{file.name}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function MessageList({
  messages,
  currentUserId,
  emptyLabel = "Select a thread to view messages",
  className,
}: MessageListProps) {
  return (
    <ScrollArea
      className={cn(
        "h-64 rounded-lg border border-border/60 p-3",
        className
      )}
    >
      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.sender.id === currentUserId;

          return (
            <div
              key={msg.id}
              className={cn(
                "mb-3 flex last:mb-0",
                isOwn ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2",
                  isOwn
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                <p
                  className={cn(
                    "text-xs font-medium",
                    isOwn
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {isOwn ? "You" : msg.sender.name} ·{" "}
                  {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                </p>
                <p className="mt-0.5 text-sm whitespace-pre-wrap">{msg.body}</p>
                {msg.attachments && msg.attachments.length > 0 && (
                  <AttachmentLinks attachments={msg.attachments} />
                )}
              </div>
            </div>
          );
        })
      )}
    </ScrollArea>
  );
}
