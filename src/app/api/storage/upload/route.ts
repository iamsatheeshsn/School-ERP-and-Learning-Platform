import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import {
  buildStoredFileName,
  getUploadPublicPath,
  guessMimeType,
  isAllowedUpload,
  MAX_UPLOAD_BYTES,
  saveUploadFile,
} from "@/lib/storage/local";
import { STORAGE_FOLDERS, type StorageFolder } from "@/lib/storage/types";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in to upload files" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (typeof folder !== "string" || !STORAGE_FOLDERS.includes(folder as StorageFolder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File must be 10 MB or smaller" }, { status: 400 });
    }

    if (!isAllowedUpload(file.name, file.type)) {
      return NextResponse.json(
        { error: "Only images and PDF files are allowed" },
        { status: 400 }
      );
    }

    const storedName = buildStoredFileName(file.name);
    const bytes = Buffer.from(await file.arrayBuffer());
    const url = await saveUploadFile(
      folder as StorageFolder,
      session.user.id,
      storedName,
      bytes
    );
    const resolvedType = guessMimeType(file.name, file.type);

    return NextResponse.json({
      url,
      name: file.name,
      size: file.size,
      type: resolvedType || file.type,
      path: getUploadPublicPath(folder as StorageFolder, session.user.id, storedName),
    });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ error: "Could not save file on the server" }, { status: 500 });
  }
}
