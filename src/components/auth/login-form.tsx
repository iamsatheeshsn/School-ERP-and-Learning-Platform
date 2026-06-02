"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { ROLE_DASHBOARD } from "@/lib/types";
import type { Role } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  className?: string;
};

type SessionResponse = {
  user?: { role?: Role };
  refreshToken?: boolean;
  error?: string;
};

function mapFirebaseAuthError(error: AuthError): string {
  switch (error.code) {
    case "auth/invalid-api-key":
    case "auth/invalid-credential":
      return "Firebase is not configured on this deployment. Add NEXT_PUBLIC_FIREBASE_* variables in Netlify and redeploy.";
    case "auth/unauthorized-domain":
      return "This site is not authorized in Firebase. Add your Netlify domain under Authentication → Settings → Authorized domains.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return "Invalid email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    default:
      return error.message || "Sign-in failed. Please try again.";
  }
}

async function postSession(idToken: string) {
  const sessionRes = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const session = (await sessionRes.json()) as SessionResponse;
  return { sessionRes, session };
}

export function LoginForm({ className }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      let idToken = await credential.user.getIdToken();

      let { sessionRes, session } = await postSession(idToken);

      if (session.refreshToken) {
        idToken = await credential.user.getIdToken(true);
        ({ sessionRes, session } = await postSession(idToken));
      }

      if (!sessionRes.ok) {
        setError(session.error ?? "Could not start a session. Check server Firebase Admin settings.");
        return;
      }

      const role = session?.user?.role;
      const destination = role ? ROLE_DASHBOARD[role] : "/";
      router.push(destination);
      router.refresh();
    } catch (err) {
      const authError = err as AuthError;
      if (authError?.code?.startsWith("auth/")) {
        setError(mapFirebaseAuthError(authError));
        return;
      }

      if (err instanceof Error && err.message.includes("Firebase client is not configured")) {
        setError(err.message);
        return;
      }

      setError("Sign-in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      {error && (
        <Alert variant="destructive" className="text-sm">
          {error}
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
        {isLoading && <LoadingSpinner size="sm" />}
        {isLoading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
