"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
} from "@/actions/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | Date | null;
  createdAt: string | Date;
  payload: Record<string, unknown>;
};

type NotificationBellProps = {
  userRole: Role;
};

const MESSAGE_PATH: Partial<Record<Role, string>> = {
  ADMIN: "/admin/messages",
  TEACHER: "/teacher/messages",
  PARENT: "/parent/messages",
};

export function NotificationBell({ userRole }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isPending, startTransition] = useTransition();

  const refreshCount = useCallback(async () => {
    const result = await getUnreadCount();
    if (result.success) setUnreadCount(result.data.count);
  }, []);

  const loadNotifications = useCallback(async () => {
    const result = await getNotifications(15);
    if (result.success) {
      setNotifications(result.data as NotificationRow[]);
    }
  }, []);

  useEffect(() => {
    void refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (open) {
      startTransition(async () => {
        await Promise.all([loadNotifications(), refreshCount()]);
      });
    }
  }, [open, loadNotifications, refreshCount]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  function navigateForNotification(notification: NotificationRow) {
    if (notification.type === "MESSAGE") {
      const path = MESSAGE_PATH[userRole];
      if (path) router.push(path);
      return;
    }

    const dashboard: Record<Role, string> = {
      ADMIN: "/admin/dashboard",
      TEACHER: "/teacher/dashboard",
      PARENT: "/parent/dashboard",
      STUDENT: "/student/dashboard",
    };
    router.push(dashboard[userRole]);
  }

  function handleSelect(notification: NotificationRow) {
    startTransition(async () => {
      if (!notification.readAt) {
        await markNotificationRead({ notificationId: notification.id });
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, readAt: new Date().toISOString() }
              : n
          )
        );
      }
      setOpen(false);
      navigateForNotification(notification);
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 outline-none relative"
        aria-label="Notifications"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {isPending ? "Loading..." : "No notifications yet"}
            </p>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
                onClick={() => handleSelect(notification)}
              >
                <span
                  className={cn(
                    "text-sm",
                    !notification.readAt && "font-semibold"
                  )}
                >
                  {notification.title}
                </span>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {notification.body}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
