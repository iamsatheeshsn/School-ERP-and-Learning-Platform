"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, GraduationCap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 72;

type AppSidebarProps = {
  role: Role;
  className?: string;
};

export function AppSidebar({ role, className }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = getNavItems(role);
  const width = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-linear-to-b from-sidebar via-sidebar to-sidebar-accent/30 text-sidebar-foreground",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary via-brand-fuchsia to-brand-emerald text-primary-foreground shadow-md shadow-primary/30">
          <GraduationCap className="size-5" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="truncate font-heading text-sm font-semibold"
            >
              ScholarOS
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-linear-to-r from-primary/15 via-brand-fuchsia/10 to-transparent text-primary shadow-sm dark:from-primary/25 dark:text-primary-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-linear-to-b from-primary to-brand-emerald" />
                )}
                <Icon className="size-4 shrink-0" />
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="truncate"
                    >
                      {item.title}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full justify-start"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </motion.aside>
  );
}
