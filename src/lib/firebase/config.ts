const FIREBASE_CLIENT_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Check config values (not dynamic process.env — Next.js only inlines static env access). */
export function getMissingFirebaseClientEnvKeys(): string[] {
  const values: (string | undefined)[] = [
    firebaseClientConfig.apiKey,
    firebaseClientConfig.authDomain,
    firebaseClientConfig.projectId,
    firebaseClientConfig.storageBucket,
    firebaseClientConfig.messagingSenderId,
    firebaseClientConfig.appId,
  ];

  return FIREBASE_CLIENT_KEYS.filter((_, index) => !values[index]?.trim());
}

export function isFirebaseClientConfigured(): boolean {
  return getMissingFirebaseClientEnvKeys().length === 0;
}

export function getFirebaseConfigHelpMessage(): string {
  const missing = getMissingFirebaseClientEnvKeys();
  if (missing.length === 0) return "";

  return [
    `Missing Firebase client configuration: ${missing.join(", ")}.`,
    "Local dev: copy .env.example to .env.local, add your Firebase web app keys, then restart npm run dev.",
    "Netlify: add the same NEXT_PUBLIC_FIREBASE_* variables in Site settings → Environment variables, then clear cache and redeploy.",
  ].join(" ");
}
