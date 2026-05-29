"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Bot, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  createHomework,
  generateWorksheet,
} from "@/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUploadField } from "@/components/shared/file-upload-field";
import type { AttachmentMeta } from "@/lib/types";

type HomeworkItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string | Date;
  subject: { name: string };
  _count: { submissions: number };
};

type HomeworkManagerProps = {
  homework: HomeworkItem[];
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
};

export function HomeworkManager({
  homework,
  classes,
  subjects,
}: HomeworkManagerProps) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">(
    "medium"
  );
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createHomework({
        classId,
        subjectId,
        title,
        description,
        dueDate: new Date(dueDate).toISOString(),
        attachments,
      });
      if (result.success) {
        toast.success("Homework created");
        setOpen(false);
        setTitle("");
        setDescription("");
        setAttachments([]);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleGenerateAI() {
    if (!topic) {
      toast.error("Enter a topic first");
      return;
    }
    startTransition(async () => {
      const result = await generateWorksheet({
        classId,
        subjectId,
        topic,
        difficulty,
      });
      if (result.success) {
        setTitle(result.data.title);
        setDescription(result.data.description);
        toast.success("Worksheet generated — review and publish");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            <Plus className="size-4" />
            Create homework
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create homework</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={(v) => v && setSubjectId(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
                <p className="text-sm font-medium">AI worksheet generator</p>
                <div className="flex gap-2">
                  <Input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic (e.g. Fractions)"
                  />
                  <Select
                    value={difficulty}
                    onValueChange={(v) =>
                      setDifficulty(v as "easy" | "medium" | "hard")
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAI}
                    disabled={isPending}
                  >
                    <Bot className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hw-desc">Description</Label>
                <Textarea
                  id="hw-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hw-due">Due date</Label>
                <Input
                  id="hw-due"
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <FileUploadField
                endpoint="homeworkAttachment"
                attachments={attachments}
                onChange={setAttachments}
                label="Assignment files (PDF, images)"
              />
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Creating..." : "Create homework"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {homework.map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="font-heading text-base">
                  <Link
                    href={`/teacher/homework/${item.id}`}
                    className="hover:underline"
                  >
                    {item.title}
                  </Link>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {item.subject.name} · Due{" "}
                  {format(new Date(item.dueDate), "MMM d, yyyy")}
                </p>
              </div>
              <Badge variant="secondary">
                {item._count.submissions} submissions
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
