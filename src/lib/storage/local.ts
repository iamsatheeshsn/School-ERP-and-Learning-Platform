import { createReadStream, existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join, normalize, relative, sep, extname } from "path";
import type { StorageFolder } from "@/lib/storage/types";

export const UPLOAD_ROOT = join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_BY_EXT));

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "file";
}

export function guessMimeType(fileName: string, reportedType?: string): string {
  if (reportedType?.trim()) return reportedType.trim();
  return MIME_BY_EXT[extname(fileName).toLowerCase()] ?? "";
}

export function isAllowedUpload(fileName: string, reportedType?: string): boolean {
  const ext = extname(fileName).toLowerCase();
  if (ALLOWED_EXTENSIONS.has(ext)) return true;

  const mime = guessMimeType(fileName, reportedType);
  if (!mime) return false;
  if (mime === "application/pdf" || mime === "text/plain") return true;
  return mime.startsWith("image/");
}

export function buildStoredFileName(originalName: string): string {
  return `${Date.now()}-${sanitizeFileName(originalName)}`;
}

export function getUploadAbsolutePath(
  folder: StorageFolder,
  userId: string,
  fileName: string
): string {
  return join(UPLOAD_ROOT, folder, userId, fileName);
}

export function getUploadPublicPath(
  folder: StorageFolder,
  userId: string,
  fileName: string
): string {
  return `/api/storage/files/${folder}/${userId}/${encodeURIComponent(fileName)}`;
}

export async function saveUploadFile(
  folder: StorageFolder,
  userId: string,
  fileName: string,
  bytes: Buffer
): Promise<string> {
  const dir = join(UPLOAD_ROOT, folder, userId);
  await mkdir(dir, { recursive: true });
  const absolutePath = join(dir, fileName);
  await writeFile(absolutePath, bytes);
  return getUploadPublicPath(folder, userId, fileName);
}

export function resolveUploadFilePath(pathParts: string[]): string | null {
  if (pathParts.length !== 3) return null;

  const [folder, userId, encodedName] = pathParts;
  if (!["homework", "messages", "avatars"].includes(folder)) return null;
  if (!userId || userId.includes("..")) return null;

  const fileName = decodeURIComponent(encodedName);
  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }

  const absolutePath = normalize(getUploadAbsolutePath(folder as StorageFolder, userId, fileName));
  const relativePath = relative(UPLOAD_ROOT, absolutePath);
  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`)) {
    return null;
  }

  if (!existsSync(absolutePath)) return null;
  return absolutePath;
}

export function createUploadReadStream(absolutePath: string) {
  return createReadStream(absolutePath);
}
