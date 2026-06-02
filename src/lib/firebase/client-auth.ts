"use client";

import { signInWithCustomToken, type User } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";

let restorePromise: Promise<User | null> | null = null;

async function restoreClientAuth(): Promise<User | null> {
  try {
    const response = await fetch("/api/auth/custom-token");
    if (!response.ok) return null;

    const data = (await response.json()) as { customToken?: string };
    if (!data.customToken) return null;

    const auth = getClientAuth();
    const credential = await signInWithCustomToken(auth, data.customToken);
    return credential.user;
  } catch {
    return null;
  }
}

export async function ensureFirebaseClientUser(): Promise<User> {
  const auth = getClientAuth();
  await auth.authStateReady();

  if (auth.currentUser) {
    return auth.currentUser;
  }

  restorePromise ??= restoreClientAuth().finally(() => {
    restorePromise = null;
  });

  const user = await restorePromise;
  if (!user) {
    throw new Error("You must be signed in to upload files");
  }

  return user;
}
