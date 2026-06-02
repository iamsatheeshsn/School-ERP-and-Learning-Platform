"use client";

import { useEffect } from "react";
import { ensureFirebaseClientUser } from "@/lib/firebase/client-auth";

export function FirebaseAuthSync() {
  useEffect(() => {
    void ensureFirebaseClientUser().catch(() => {
      // Session-only pages without a valid cookie can ignore this.
    });
  }, []);

  return null;
}
