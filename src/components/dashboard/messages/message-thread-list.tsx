"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { ThreadItem } from "@/hooks/use-messages-panel";
import { cn } from "@/lib/utils";

type MessageThreadListProps = {
  title: string;
  threads: ThreadItem[];
  selectedThreadId: string | null;
  onSelect: (threadId: string) => void;
  renderSubtitle: (thread: ThreadItem) => string;
};

export function MessageThreadList({
  title,
  threads,
  selectedThreadId,
  onSelect,
  renderSubtitle,
}: MessageThreadListProps) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          {threads.map((thread) => {
            const preview = thread.messages[0];
            const hasUnread = (thread.unreadCount ?? 0) > 0;

            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelect(thread.id)}
                className={cn(
                  "w-full border-b border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                  selectedThreadId === thread.id && "bg-muted/50",
                  hasUnread && "border-l-2 border-l-primary"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={cn(
                      "text-sm line-clamp-1",
                      hasUnread ? "font-semibold" : "font-medium"
                    )}
                  >
                    {thread.subject}
                  </p>
                  {hasUnread && (
                    <Badge variant="default" className="shrink-0 text-[10px] px-1.5">
                      {thread.unreadCount}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {renderSubtitle(thread)}
                </p>
                {preview && (
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "line-clamp-1 text-xs",
                        hasUnread
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {preview.body}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(preview.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
