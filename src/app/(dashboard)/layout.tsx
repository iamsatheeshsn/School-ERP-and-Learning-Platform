import { redirect } from "next/navigation";
import { FirebaseAuthSync } from "@/components/auth/firebase-auth-sync";
import { CommandPalette } from "@/components/layout/command-palette";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { clearSessionCookie } from "@/lib/auth/session";
import { getSessionUser } from "@/lib/rbac/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) {
    await clearSessionCookie();
    redirect("/login");
  }

  return (
    <QueryProvider>
      <FirebaseAuthSync />
      <DashboardShell user={user}>{children}</DashboardShell>
      <CommandPalette role={user.role} />
      <Toaster />
    </QueryProvider>
  );
}
