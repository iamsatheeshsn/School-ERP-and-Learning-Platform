"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { submitHomework } from "@/actions/homework";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type HomeworkSubmission = {
  id: string;
  status: string;
  homework: {
    id: string;
    title: string;
    description: string;
    dueDate: string | Date;
    subject: { name: string };
  };
};

type StudentHomeworkListProps = {
  submissions: HomeworkSubmission[];
};

export function StudentHomeworkList({ submissions }: StudentHomeworkListProps) {
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(homeworkId: string) {
    startTransition(async () => {
      const result = await submitHomework({ homeworkId, content });
      if (result.success) {
        toast.success("Homework submitted");
        setContent("");
        setSelectedId(null);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-4">
      {submissions.map((sub) => (
        <Card key={sub.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">
                <Link
                  href={`/student/homework/${sub.homework.id}`}
                  className="hover:underline"
                >
                  {sub.homework.title}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {sub.homework.subject.name} · Due{" "}
                {format(new Date(sub.homework.dueDate), "MMM d, yyyy")}
              </p>
            </div>
            <Badge>{sub.status}</Badge>
          </CardHeader>
          <CardContent className="flex justify-end gap-2">
            <Link
              href={`/student/homework/${sub.homework.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open & tutor
            </Link>
            {sub.status === "PENDING" && (
              <Dialog
                open={selectedId === sub.homework.id}
                onOpenChange={(open) =>
                  setSelectedId(open ? sub.homework.id : null)
                }
              >
                <DialogTrigger className="inline-flex h-7 items-center justify-center rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                  Submit
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit homework</DialogTitle>
                  </DialogHeader>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Your answer..."
                    rows={6}
                  />
                  <Button
                    onClick={() => handleSubmit(sub.homework.id)}
                    disabled={isPending}
                  >
                    Submit
                  </Button>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
