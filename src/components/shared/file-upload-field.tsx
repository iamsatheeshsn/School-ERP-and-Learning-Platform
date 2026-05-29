"use client";

import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { UploadButton, type UploadEndpoint } from "@/lib/uploadthing";
import type { AttachmentMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";

type FileUploadFieldProps = {
  endpoint: UploadEndpoint;
  attachments: AttachmentMeta[];
  onChange: (attachments: AttachmentMeta[]) => void;
  label?: string;
};

export function FileUploadField({
  endpoint,
  attachments,
  onChange,
  label = "Attachments",
}: FileUploadFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <UploadButton
          endpoint={endpoint}
          onClientUploadComplete={(files) => {
            const next = files.map((f) => ({
              url: f.url,
              name: f.name,
              size: f.size,
              type: f.type ?? undefined,
            }));
            onChange([...attachments, ...next]);
            toast.success(`${files.length} file(s) uploaded`);
          }}
          onUploadError={(error) => {
            toast.error(error.message || "Upload failed");
          }}
          appearance={{
            button:
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted",
            allowedContent: "hidden",
          }}
          content={{
            button: "Add file",
          }}
        />
      </div>
      {attachments.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-border/60 p-2">
          {attachments.map((file, i) => (
            <li
              key={`${file.url}-${i}`}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-primary hover:underline"
                >
                  {file.name}
                </a>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() =>
                  onChange(attachments.filter((_, idx) => idx !== i))
                }
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
