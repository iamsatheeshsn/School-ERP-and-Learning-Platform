import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { QueryProvider } from "@/components/layout/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { getSessionUser } from "@/lib/rbac/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader
            userName={user.name}
            userEmail={user.email}
            userAvatar={user.avatar}
            userRole={user.role}
          />
          <main className="mesh-gradient relative flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette role={user.role} />
      <Toaster />
    </QueryProvider>
  );
}
