"use client";

import { MessageCompose } from "@/components/dashboard/messages/message-compose";
import { MessageList } from "@/components/dashboard/messages/message-list";
import { MessageThreadList } from "@/components/dashboard/messages/message-thread-list";
import { MessagesPanelLayout } from "@/components/dashboard/messages/messages-panel-layout";
import { ParentNewMessageDialog } from "@/components/dashboard/parent/new-message-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMessagesPanel,
  type ThreadItem,
} from "@/hooks/use-messages-panel";
import type { ParentMessageContact } from "@/lib/queries/messages";

type ParentMessagesPanelProps = {
  threads: ThreadItem[];
  contacts: ParentMessageContact[];
  currentUserId: string;
};

export function ParentMessagesPanel({
  threads: initialThreads,
  contacts,
  currentUserId,
}: ParentMessagesPanelProps) {
  const {
    threads,
    activeThread,
    selectedThread,
    messages,
    messagesLoading,
    body,
    setBody,
    attachments,
    setAttachments,
    isPending,
    loadMessages,
    clearSelection,
    handleSend,
    refreshThreads,
  } = useMessagesPanel({ initialThreads, currentUserId });

  return (
    <MessagesPanelLayout
      showDetail={Boolean(selectedThread)}
      onBack={clearSelection}
      threadList={
        <MessageThreadList
          title="Conversations"
          threads={threads}
          selectedThreadId={selectedThread}
          onSelect={loadMessages}
          headerAction={
            <ParentNewMessageDialog
              contacts={contacts}
              onCreated={(threadId) => void refreshThreads(threadId)}
            />
          }
          emptyMessage="Start a conversation using New message."
          renderSubtitle={(thread) =>
            `${thread.student.user.name} · Teacher: ${thread.teacher?.user.name ?? ""}`
          }
        />
      }
      detail={
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              {activeThread?.subject ?? "Select a conversation"}
            </CardTitle>
            {activeThread && (
              <p className="text-sm text-muted-foreground">
                {activeThread.student.user.name} ·{" "}
                {activeThread.teacher?.user.name ?? "Teacher"}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedThread ? (
              <>
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  loading={messagesLoading}
                  className="min-h-[280px]"
                />
                <MessageCompose
                  body={body}
                  onBodyChange={setBody}
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  onSubmit={handleSend}
                  disabled={isPending}
                  placeholder="Reply to teacher..."
                />
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Choose a conversation from the list or send a new message to a
                teacher.
              </p>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
