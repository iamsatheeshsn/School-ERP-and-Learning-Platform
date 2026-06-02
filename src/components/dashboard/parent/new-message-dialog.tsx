"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { startParentConversation } from "@/actions/messages";
import { FileUploadField } from "@/components/shared/file-upload-field";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { ParentMessageContact } from "@/lib/queries/messages";
import type { AttachmentMeta } from "@/lib/types";
import { cn } from "@/lib/utils";

type ParentNewMessageDialogProps = {
  contacts: ParentMessageContact[];
  onCreated: (threadId: string) => void;
};

export function ParentNewMessageDialog({
  contacts,
  onCreated,
}: ParentNewMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [contactKey, setContactKey] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [isPending, startTransition] = useTransition();

  const selectedContact = useMemo(
    () =>
      contacts.find(
        (contact) =>
          `${contact.studentId}:${contact.teacherId}` === contactKey
      ),
    [contactKey, contacts]
  );

  const canSubmit =
    Boolean(selectedContact) &&
    subject.trim().length > 0 &&
    (body.trim().length > 0 || attachments.length > 0);

  function resetForm() {
    setContactKey("");
    setSubject("");
    setBody("");
    setAttachments([]);
  }

  function handleContactChange(value: string) {
    setContactKey(value);
    const contact = contacts.find(
      (item) => `${item.studentId}:${item.teacherId}` === value
    );
    if (contact && !subject.trim()) {
      setSubject(`Regarding ${contact.studentName}`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact || !canSubmit) return;

    startTransition(async () => {
      const result = await startParentConversation({
        studentId: selectedContact.studentId,
        teacherId: selectedContact.teacherId,
        subject: subject.trim(),
        body: body.trim() || "(attachment)",
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      if (result.success) {
        toast.success("Message sent");
        setOpen(false);
        resetForm();
        onCreated(result.data.threadId);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
      >
        <Plus className="size-4" />
        New message
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100vw-2rem),42rem)] max-w-none gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="space-y-1 border-b border-border/60 px-5 py-4 sm:px-6">
          <DialogTitle>Message a teacher</DialogTitle>
          <DialogDescription>
            Choose your child and their teacher, then send your message.
          </DialogDescription>
        </DialogHeader>

        {contacts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground sm:px-6">
            No teachers are linked to your children&apos;s classes yet.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="message-contact">Child & teacher</Label>
                <Select
                  value={contactKey}
                  onValueChange={(value) => value && handleContactChange(value)}
                >
                  <SelectTrigger
                    id="message-contact"
                    className="h-10 w-full max-w-none"
                  >
                    <SelectValue placeholder="Select who to message" />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    {contacts.map((contact) => (
                      <SelectItem
                        key={`${contact.studentId}:${contact.teacherId}`}
                        value={`${contact.studentId}:${contact.teacherId}`}
                      >
                        {contact.studentName} · {contact.teacherName} (
                        {contact.className})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-subject">Subject</Label>
                <Input
                  id="message-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Regarding homework"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-body">Message</Label>
                <Textarea
                  id="message-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message to the teacher..."
                  rows={4}
                  className="min-h-28 resize-none"
                />
              </div>

              <FileUploadField
                folder="messages"
                attachments={attachments}
                onChange={setAttachments}
                label="Attachments"
              />
            </div>

            <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-5 py-4 sm:flex-row sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full sm:w-auto"
              >
                {isPending ? "Sending..." : "Send message"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
