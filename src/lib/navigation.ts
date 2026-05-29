import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart3,
  BookOpen,
  Bot,
  Baby,
  ClipboardCheck,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  MessageSquare,
  CalendarDays,
  School,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Role } from "@prisma/client";
import { ROLE_ROUTES } from "@/lib/rbac/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

function prefix(role: Role, segment: string): string {
  return `${ROLE_ROUTES[role]}${segment}`;
}

export const NAVIGATION: Record<Role, NavItem[]> = {
  [Role.ADMIN]: [
    { title: "Dashboard", href: prefix(Role.ADMIN, "/dashboard"), icon: LayoutDashboard },
    { title: "Users", href: prefix(Role.ADMIN, "/users"), icon: UserPlus },
    { title: "Students", href: prefix(Role.ADMIN, "/students"), icon: Users },
    { title: "Classes", href: prefix(Role.ADMIN, "/classes"), icon: School },
    { title: "Timetable", href: prefix(Role.ADMIN, "/timetable"), icon: CalendarDays },
    { title: "Fees", href: prefix(Role.ADMIN, "/fees"), icon: Wallet },
    { title: "Analytics", href: prefix(Role.ADMIN, "/analytics"), icon: BarChart3 },
    { title: "Audit log", href: prefix(Role.ADMIN, "/audit-log"), icon: History },
    { title: "Messages", href: prefix(Role.ADMIN, "/messages"), icon: MessageSquare },
    { title: "Settings", href: prefix(Role.ADMIN, "/settings"), icon: Settings },
  ],
  [Role.TEACHER]: [
    { title: "Dashboard", href: prefix(Role.TEACHER, "/dashboard"), icon: LayoutDashboard },
    { title: "Classes", href: prefix(Role.TEACHER, "/classes"), icon: School },
    { title: "Timetable", href: prefix(Role.TEACHER, "/timetable"), icon: CalendarDays },
    { title: "Homework", href: prefix(Role.TEACHER, "/homework"), icon: BookOpen },
    { title: "Attendance", href: prefix(Role.TEACHER, "/attendance"), icon: ClipboardCheck },
    { title: "Grades", href: prefix(Role.TEACHER, "/grades"), icon: Award },
    { title: "Report Cards", href: prefix(Role.TEACHER, "/report-cards"), icon: FileText },
    { title: "Messages", href: prefix(Role.TEACHER, "/messages"), icon: MessageSquare },
  ],
  [Role.PARENT]: [
    { title: "Dashboard", href: prefix(Role.PARENT, "/dashboard"), icon: LayoutDashboard },
    { title: "Children", href: prefix(Role.PARENT, "/children"), icon: Baby },
    { title: "Homework", href: prefix(Role.PARENT, "/homework"), icon: BookOpen },
    { title: "Attendance", href: prefix(Role.PARENT, "/attendance"), icon: ClipboardCheck },
    { title: "Report Cards", href: prefix(Role.PARENT, "/report-cards"), icon: FileText },
    { title: "Fees", href: prefix(Role.PARENT, "/fees"), icon: Wallet },
    { title: "Messages", href: prefix(Role.PARENT, "/messages"), icon: MessageSquare },
  ],
  [Role.STUDENT]: [
    { title: "Dashboard", href: prefix(Role.STUDENT, "/dashboard"), icon: LayoutDashboard },
    { title: "Homework", href: prefix(Role.STUDENT, "/homework"), icon: BookOpen },
    { title: "Grades", href: prefix(Role.STUDENT, "/grades"), icon: GraduationCap },
    { title: "AI Tutor", href: prefix(Role.STUDENT, "/ai-tutor"), icon: Bot },
    { title: "Report Cards", href: prefix(Role.STUDENT, "/report-cards"), icon: FileText },
  ],
};

export function getNavItems(role: Role): NavItem[] {
  return NAVIGATION[role] ?? [];
}

export function getAllNavItems(): NavItem[] {
  return Object.values(NAVIGATION).flat();
}
