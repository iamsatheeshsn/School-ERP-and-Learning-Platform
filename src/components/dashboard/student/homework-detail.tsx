"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Bot, Send } from "lucide-react";
import { toast } from "sonner";
import { submitHomework } from "@/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileUploadField } from "@/components/shared/file-upload-field";
import type { AttachmentMeta } from "@/lib/types";

type TutorChatProps = {
  homework: {
    id: string;
    title: string;
    description: string;
    dueDate: string | Date;
    subject: { name: string };
  };
  submissionStatus: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function StudentHomeworkDetail({
  homework,
  submissionStatus,
}: TutorChatProps) {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleSubmit() {
    startTransition(async () => {
      const result = await submitHomework({
        homeworkId: homework.id,
        content,
        attachments,
      });
      if (result.success) {
        toast.success("Homework submitted");
      } else {
        toast.error(result.error);
      }
    });
  }

  async function handleTutorSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: chatInput };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setChatInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/homework-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeworkId: homework.id,
          messages: nextMessages,
        }),
      });

      if (!res.ok) {
        throw new Error("Tutor unavailable");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantText += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const updated = [...m];
            updated[updated.length - 1] = {
              role: "assistant",
              content: assistantText,
            };
            return updated;
          });
        }
      }
    } catch {
      toast.error("AI tutor is unavailable. Check your API key.");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="font-heading text-xl">
                {homework.title}
              </CardTitle>
              <Badge>{submissionStatus}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {homework.subject.name} · Due{" "}
              {format(new Date(homework.dueDate), "MMM d, yyyy")}
            </p>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{homework.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your answer here..."
              rows={8}
            />
            <FileUploadField
              endpoint="homeworkAttachment"
              attachments={attachments}
              onChange={setAttachments}
              label="Upload files (PDF, images)"
            />
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Submitting..." : "Submit homework"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Bot className="size-5 text-primary" />
            AI Tutor
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Get hints and guidance — not direct answers.
          </p>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <ScrollArea className="h-72 rounded-lg border border-border/60 p-3" ref={scrollRef}>
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask a question about this assignment to get started.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`mb-3 text-sm ${
                    msg.role === "user" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">
                    {msg.role === "user" ? "You" : "Tutor"}
                  </p>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </ScrollArea>
          <form onSubmit={handleTutorSend} className="flex gap-2">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask for a hint..."
              rows={2}
              className="flex-1"
              disabled={streaming}
            />
            <Button type="submit" size="icon" disabled={streaming}>
              <Send className="size-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
