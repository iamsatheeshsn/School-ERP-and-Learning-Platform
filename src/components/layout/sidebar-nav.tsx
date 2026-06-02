"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/lib/types/enums";
import { AnimatePresence, motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getNavItems } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  role: Role;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function SidebarBrand({
  collapsed,
  compact,
  className,
}: {
  collapsed?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        compact ? "min-w-0" : "h-14 px-3",
        className
      )}
    >
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
  );
}

export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
  className,
}: SidebarNavProps) {
  const pathname = usePathname();
  const navItems = getNavItems(role);

  return (
    <ScrollArea className={cn("flex-1 px-2 py-3", className)}>
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
              onClick={onNavigate}
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
  );
}
