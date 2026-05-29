"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import { useTheme } from "@/components/layout/theme-provider";
import {
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ROLE_ROUTES } from "@/lib/rbac/permissions";
import { cn } from "@/lib/utils";

type DashboardHeaderProps = {
  userName?: string | null;
  userEmail?: string | null;
  userAvatar?: string | null;
  userRole: Role;
  className?: string;
};

export function DashboardHeader({
  userName,
  userEmail,
  userAvatar,
  userRole,
  className,
}: DashboardHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  async function handleSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-4 border-b border-primary/10 bg-background/70 px-4 backdrop-blur-md",
        className
      )}
    >
      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        <NotificationBell userRole={userRole} />

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-8 items-center gap-2 rounded-full border-0 bg-transparent px-1 pr-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
            <Avatar size="sm">
              {userAvatar && <AvatarImage src={userAvatar} alt={userName ?? ""} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[120px] truncate text-sm font-medium sm:inline">
              {userName ?? "User"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{userName ?? "User"}</span>
                  {userEmail && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {userEmail}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="size-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    userRole === Role.ADMIN
                      ? `${ROLE_ROUTES.ADMIN}/settings`
                      : "/profile#password"
                  )
                }
              >
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
