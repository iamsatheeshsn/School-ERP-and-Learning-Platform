"use client";

import { FileUploadField } from "@/components/shared/file-upload-field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AttachmentMeta } from "@/lib/types";

type MessageComposeProps = {
  body: string;
  onBodyChange: (value: string) => void;
  attachments: AttachmentMeta[];
  onAttachmentsChange: (attachments: AttachmentMeta[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function MessageCompose({
  body,
  onBodyChange,
  attachments,
  onAttachmentsChange,
  onSubmit,
  disabled,
  placeholder = "Write a message...",
}: MessageComposeProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FileUploadField
        endpoint="messageAttachment"
        attachments={attachments}
        onChange={onAttachmentsChange}
        label="Attach files"
      />
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={disabled || (!body.trim() && attachments.length === 0)}
          className="self-end"
        >
          Send
        </Button>
      </div>
    </form>
  );
}
