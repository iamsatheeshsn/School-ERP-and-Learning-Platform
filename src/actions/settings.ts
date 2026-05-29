"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  mergeSchoolSettings,
  parseNotificationSettings,
  type NotificationSettings,
} from "@/lib/school/settings";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const updateSchoolProfileSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(2, "School name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z
    .string()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  logoUrl: z
    .string()
    .refine((value) => value === "" || z.string().url().safeParse(value).success, {
      message: "Enter a valid URL",
    }),
});

const createAcademicYearSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(4, "Academic year name is required"),
  startDate: z.string(),
  endDate: z.string(),
  setCurrent: z.boolean().optional(),
});

const setCurrentAcademicYearSchema = z.object({
  academicYearId: z.string(),
});

const notificationSettingsSchema = z.object({
  schoolId: z.string(),
  emailEnabled: z.boolean(),
  attendanceAlerts: z.boolean(),
  homeworkReminders: z.boolean(),
  feeReminders: z.boolean(),
  reportCardPublished: z.boolean(),
  broadcastMessages: z.boolean(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateSettingsPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/dashboard");
}

async function getSchoolOrFail(schoolId: string) {
  const school = await db.school.findUnique({ where: { id: schoolId } });
  if (!school) throw new Error("School not found");
  return school;
}

export async function updateSchoolProfile(
  input: z.infer<typeof updateSchoolProfileSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateSchoolProfileSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    await getSchoolOrFail(parsed.data.schoolId);

    await db.school.update({
      where: { id: parsed.data.schoolId },
      data: {
        name: parsed.data.name.trim(),
        address: parsed.data.address?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        email: parsed.data.email?.trim() || null,
        logoUrl: parsed.data.logoUrl?.trim() || null,
      },
    });

    revalidateSettingsPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function createAcademicYear(
  input: z.infer<typeof createAcademicYearSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = createAcademicYearSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const startDate = new Date(parsed.data.startDate);
    const endDate = new Date(parsed.data.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return fail("Enter valid start and end dates");
    }
    if (endDate <= startDate) {
      return fail("End date must be after start date");
    }

    await getSchoolOrFail(parsed.data.schoolId);

    const year = await db.$transaction(async (tx) => {
      if (parsed.data.setCurrent) {
        await tx.academicYear.updateMany({
          where: { schoolId: parsed.data.schoolId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicYear.create({
        data: {
          schoolId: parsed.data.schoolId,
          name: parsed.data.name.trim(),
          startDate,
          endDate,
          isCurrent: parsed.data.setCurrent ?? false,
        },
      });
    });

    revalidateSettingsPaths();
    revalidatePath("/admin/classes");
    return ok({ id: year.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function setCurrentAcademicYear(
  input: z.infer<typeof setCurrentAcademicYearSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = setCurrentAcademicYearSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const year = await db.academicYear.findUnique({
      where: { id: parsed.data.academicYearId },
      select: { id: true, schoolId: true },
    });
    if (!year) return fail("Academic year not found");

    await db.$transaction([
      db.academicYear.updateMany({
        where: { schoolId: year.schoolId, isCurrent: true },
        data: { isCurrent: false },
      }),
      db.academicYear.update({
        where: { id: year.id },
        data: { isCurrent: true },
      }),
    ]);

    revalidateSettingsPaths();
    revalidatePath("/admin/classes");
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function updateNotificationSettings(
  input: z.infer<typeof notificationSettingsSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = notificationSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const school = await getSchoolOrFail(parsed.data.schoolId);
    const notifications: NotificationSettings = {
      emailEnabled: parsed.data.emailEnabled,
      attendanceAlerts: parsed.data.attendanceAlerts,
      homeworkReminders: parsed.data.homeworkReminders,
      feeReminders: parsed.data.feeReminders,
      reportCardPublished: parsed.data.reportCardPublished,
      broadcastMessages: parsed.data.broadcastMessages,
    };

    await db.school.update({
      where: { id: parsed.data.schoolId },
      data: {
        settings: mergeSchoolSettings(school.settings, notifications),
      },
    });

    revalidateSettingsPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}
