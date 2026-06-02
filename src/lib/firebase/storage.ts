"use client";

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ensureFirebaseClientUser } from "@/lib/firebase/client-auth";
import { getClientStorage } from "@/lib/firebase/client";

import type { StorageFolder } from "@/lib/storage/types";

export type { StorageFolder } from "@/lib/storage/types";

export async function uploadFileToStorage(
  folder: StorageFolder,
  file: File
): Promise<{ url: string; name: string; size: number; type: string }> {
  const user = await ensureFirebaseClientUser();

  const idToken = await user.getIdToken();
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const storage = getClientStorage();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${user.uid}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(storageRef);

  return {
    url,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}
