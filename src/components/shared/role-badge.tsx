import { Role } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<Role, string> = {
  [Role.ADMIN]:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  [Role.TEACHER]:
    "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  [Role.PARENT]:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  [Role.STUDENT]:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.TEACHER]: "Teacher",
  [Role.PARENT]: "Parent",
  [Role.STUDENT]: "Student",
};

type RoleBadgeProps = {
  role: Role;
  className?: string;
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", ROLE_STYLES[role], className)}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}
