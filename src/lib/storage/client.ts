"use client";

import type { StorageFolder } from "@/lib/storage/types";

export type UploadResult = {
  url: string;
  name: string;
  size: number;
  type: string;
};

export async function uploadFile(
  folder: StorageFolder,
  file: File
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/storage/upload", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as UploadResult & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Upload failed");
  }

  return data;
}
