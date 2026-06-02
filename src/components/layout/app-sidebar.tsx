"use client";

import { Role } from "@/lib/types/enums";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarBrand, SidebarNav } from "@/components/layout/sidebar-nav";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 72;

type AppSidebarProps = {
  role: Role;
  className?: string;
};

export function AppSidebar({ role, className }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
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
      <SidebarBrand collapsed={collapsed} />
      <Separator />
      <SidebarNav role={role} collapsed={collapsed} />

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
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-2"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.aside>
  );
}
