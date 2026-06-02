"use client";

import { useState } from "react";
import type { SessionUser } from "@/lib/types";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar-nav";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

type DashboardShellProps = {
  user: SessionUser;
  children: React.ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar role={user.role} className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader
            userName={user.name}
            userEmail={user.email}
            userAvatar={user.avatar}
            userRole={user.role}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main className="mesh-gradient relative flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-3rem,280px)] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetTitle className="sr-only">Navigation menu</SheetTitle>
          <SidebarBrand />
          <Separator />
          <SidebarNav
            role={user.role}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
