"use client";

import { MessageCompose } from "@/components/dashboard/messages/message-compose";
import { MessageList } from "@/components/dashboard/messages/message-list";
import { MessageThreadList } from "@/components/dashboard/messages/message-thread-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMessagesPanel,
  type ThreadItem,
} from "@/hooks/use-messages-panel";

type ParentMessagesPanelProps = {
  threads: ThreadItem[];
  currentUserId: string;
};

export function ParentMessagesPanel({
  threads: initialThreads,
  currentUserId,
}: ParentMessagesPanelProps) {
  const {
    threads,
    selectedThread,
    messages,
    body,
    setBody,
    attachments,
    setAttachments,
    isPending,
    loadMessages,
    handleSend,
  } = useMessagesPanel({ initialThreads, currentUserId });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <MessageThreadList
        title="Conversations"
        threads={threads}
        selectedThreadId={selectedThread}
        onSelect={loadMessages}
        renderSubtitle={(thread) =>
          `${thread.student.user.name} · Teacher: ${thread.teacher?.user.name ?? ""}`
        }
      />

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MessageList messages={messages} currentUserId={currentUserId} />
          <MessageCompose
            body={body}
            onBodyChange={setBody}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onSubmit={handleSend}
            disabled={isPending || !selectedThread}
            placeholder="Reply to teacher..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
