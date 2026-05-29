"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/layout/theme-provider";
import { Role } from "@prisma/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { getNavItems } from "@/lib/navigation";

type CommandPaletteProps = {
  role: Role;
};

export function CommandPalette({ role }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const navItems = getNavItems(role);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  function runCommand(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`${item.title} ${item.href}`}
                onSelect={() => runCommand(item.href)}
              >
                <Icon className="size-4" />
                <span>{item.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Actions">
          <CommandItem
            value="toggle theme"
            onSelect={() => {
              setOpen(false);
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
            }}
          >
            Toggle theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
