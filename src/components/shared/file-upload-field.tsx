"use client";

import { useRef, useState } from "react";
import { Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { StorageFolder } from "@/lib/storage/types";
import { uploadFile } from "@/lib/storage/client";
import type { AttachmentMeta } from "@/lib/types";
import { Button } from "@/components/ui/button";

type FileUploadFieldProps = {
  folder: StorageFolder;
  attachments: AttachmentMeta[];
  onChange: (attachments: AttachmentMeta[]) => void;
  label?: string;
  accept?: string;
};

export function FileUploadField({
  folder,
  attachments,
  onChange,
  label = "Attachments",
  accept = "image/*,.pdf",
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      const uploaded: AttachmentMeta[] = [];
      for (const file of Array.from(fileList)) {
        const result = await uploadFile(folder, file);
        uploaded.push(result);
      }
      onChange([...attachments, ...uploaded]);
      toast.success(`${uploaded.length} file(s) uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {uploading ? "Uploading..." : "Add file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
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
                onClick={() => onChange(attachments.filter((_, idx) => idx !== i))}
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
