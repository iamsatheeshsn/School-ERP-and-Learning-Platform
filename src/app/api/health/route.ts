import { NextResponse } from "next/server";
import {
  getMissingFirebaseClientEnvKeys,
  isFirebaseClientConfigured,
} from "@/lib/firebase/config";

export async function GET() {
  const missingClientKeys = getMissingFirebaseClientEnvKeys();
  const hasAdminProjectId = Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID?.trim() ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()
  );
  const hasAdminEmail = Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim());
  const hasAdminKey = Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim());

  return NextResponse.json({
    ok: isFirebaseClientConfigured() && hasAdminProjectId && hasAdminEmail && hasAdminKey,
    firebaseClient: {
      configured: isFirebaseClientConfigured(),
      missingKeys: missingClientKeys,
    },
    firebaseAdmin: {
      configured: hasAdminProjectId && hasAdminEmail && hasAdminKey,
      missingKeys: [
        !hasAdminProjectId ? "FIREBASE_ADMIN_PROJECT_ID" : null,
        !hasAdminEmail ? "FIREBASE_ADMIN_CLIENT_EMAIL" : null,
        !hasAdminKey ? "FIREBASE_ADMIN_PRIVATE_KEY" : null,
      ].filter(Boolean),
    },
  });
}
