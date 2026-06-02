import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

type AdminCredentialConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  emulator: false;
};

type EmulatorConfig = {
  projectId: string;
  emulator: true;
};

function loadServiceAccountFromFile(): AdminCredentialConfig | null {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    join(process.cwd(), "firebase-service-account.json"),
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;

    const json = JSON.parse(readFileSync(filePath, "utf8")) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };

    if (!json.project_id || !json.client_email || !json.private_key) continue;

    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key,
      emulator: false,
    };
  }

  return null;
}

function getAdminConfig(): AdminCredentialConfig | EmulatorConfig {
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT;

  if (process.env.FIRESTORE_EMULATOR_HOST && projectId) {
    return { projectId, emulator: true };
  }

  const fromFile = loadServiceAccountFromFile();
  if (fromFile) return fromFile;

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey, emulator: false };
  }

  const missing: string[] = [];
  if (!projectId) missing.push("FIREBASE_ADMIN_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  if (!clientEmail) missing.push("FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!privateKey) missing.push("FIREBASE_ADMIN_PRIVATE_KEY");

  throw new Error(
    [
      "Missing Firebase Admin credentials for seed/server operations.",
      "",
      "Option A — service account JSON file (recommended):",
      "  1. Firebase Console → Project settings → Service accounts → Generate new private key",
      "  2. Save the file as firebase-service-account.json in the project root",
      "     OR set GOOGLE_APPLICATION_CREDENTIALS=./path/to/key.json in .env.local",
      "",
      "Option B — paste into .env.local from that JSON:",
      "  FIREBASE_ADMIN_PROJECT_ID=<project_id>",
      "  FIREBASE_ADMIN_CLIENT_EMAIL=<client_email>",
      '  FIREBASE_ADMIN_PRIVATE_KEY="<private_key with \\n for newlines>"',
      "",
      `Missing: ${missing.join(", ")}`,
    ].join("\n")
  );
}

let adminApp: App | undefined;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    return adminApp;
  }

  const config = getAdminConfig();

  if (config.emulator) {
    adminApp = initializeApp({ projectId: config.projectId });
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/firebase/constants";
