"use client";

import { useState, useTransition } from "react";
import { Bot } from "lucide-react";
import { toast } from "sonner";
import { draftMessageWithAI } from "@/actions/messages";
import { MessageCompose } from "@/components/dashboard/messages/message-compose";
import { MessageList } from "@/components/dashboard/messages/message-list";
import { MessageThreadList } from "@/components/dashboard/messages/message-thread-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMessagesPanel,
  type ThreadItem,
} from "@/hooks/use-messages-panel";

type MessagesPanelProps = {
  threads: ThreadItem[];
  students: { id: string; name: string }[];
  currentUserId: string;
};

export function MessagesPanel({
  threads: initialThreads,
  students,
  currentUserId,
}: MessagesPanelProps) {
  const {
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
  } = useMessagesPanel({ initialThreads, currentUserId });

  const [attendanceSummary, setAttendanceSummary] = useState("");
  const [homeworkSummary, setHomeworkSummary] = useState("");
  const [gradesSummary, setGradesSummary] = useState("");
  const [isDraftPending, startDraftTransition] = useTransition();

  function handleAIDraft() {
    const student = activeThread
      ? students.find((s) => s.name === activeThread.student.user.name)
      : students[0];
    if (!student) return;
    startDraftTransition(async () => {
      const result = await draftMessageWithAI({
        studentId: student.id,
        attendanceSummary,
        homeworkSummary,
        gradesSummary,
      });
      if (result.success) {
        setBody(result.data.draft);
        toast.success("Draft generated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <MessageThreadList
        title="Threads"
        threads={threads}
        selectedThreadId={selectedThread}
        onSelect={loadMessages}
        renderSubtitle={(thread) =>
          `${thread.student.user.name} · ${thread.parent?.user.name ?? ""}`
        }
      />

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            {activeThread?.subject ?? "Select a thread"}
          </CardTitle>
          {activeThread && (
            <Badge variant="secondary">{activeThread.student.user.name}</Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            className="h-48"
          />

          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4" /> AI draft assist
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Attendance</Label>
                <Input
                  value={attendanceSummary}
                  onChange={(e) => setAttendanceSummary(e.target.value)}
                  placeholder="95% this month"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Homework</Label>
                <Input
                  value={homeworkSummary}
                  onChange={(e) => setHomeworkSummary(e.target.value)}
                  placeholder="3/4 submitted"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grades</Label>
                <Input
                  value={gradesSummary}
                  onChange={(e) => setGradesSummary(e.target.value)}
                  placeholder="B+ average"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAIDraft}
              disabled={isDraftPending}
            >
              Generate draft
            </Button>
          </div>

          <MessageCompose
            body={body}
            onBodyChange={setBody}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            onSubmit={handleSend}
            disabled={isPending || !selectedThread}
          />
        </CardContent>
      </Card>
    </div>
  );
}
