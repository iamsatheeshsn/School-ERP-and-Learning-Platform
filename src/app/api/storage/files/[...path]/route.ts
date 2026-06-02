import { stat } from "fs/promises";
import { extname } from "path";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  createUploadReadStream,
  resolveUploadFilePath,
} from "@/lib/storage/local";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
};

function contentTypeForPath(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await context.params;
    const absolutePath = resolveUploadFilePath(path);
    if (!absolutePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileStat = await stat(absolutePath);
    const stream = createUploadReadStream(absolutePath);

    return new NextResponse(stream as unknown as BodyInit, {
      headers: {
        "Content-Type": contentTypeForPath(absolutePath),
        "Content-Length": String(fileStat.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File download failed:", error);
    return NextResponse.json({ error: "Could not read file" }, { status: 500 });
  }
}
