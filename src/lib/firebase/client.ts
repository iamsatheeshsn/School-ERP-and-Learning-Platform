import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  firebaseClientConfig,
  getFirebaseConfigHelpMessage,
  getMissingFirebaseClientEnvKeys,
} from "@/lib/firebase/config";

const firebaseConfig = firebaseClientConfig;

let clientApp: FirebaseApp | undefined;

export function getClientApp(): FirebaseApp {
  if (clientApp) return clientApp;
  if (getApps().length > 0) {
    clientApp = getApps()[0];
    return clientApp;
  }

  const missing = getMissingFirebaseClientEnvKeys();
  if (missing.length > 0) {
    throw new Error(getFirebaseConfigHelpMessage());
  }

  clientApp = initializeApp(firebaseConfig);
  return clientApp;
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp());
}

export function getClientStorage(): FirebaseStorage {
  return getStorage(getClientApp());
}
