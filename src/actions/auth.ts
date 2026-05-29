"use server";

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireAuth, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult, type SessionUser } from "@/lib/types";

const registerSchema = z
  .object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.nativeEnum(Role),
    classId: z.string().optional(),
    rollNo: z.string().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === Role.STUDENT) {
      if (!data.classId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Class is required for students",
          path: ["classId"],
        });
      }
      if (!data.rollNo?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Roll number is required for students",
          path: ["rollNo"],
        });
      }
    }
  });

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateRegistrationPaths(role: Role) {
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  if (role === Role.TEACHER) revalidatePath("/teacher/dashboard");
  if (role === Role.PARENT) revalidatePath("/parent/dashboard");
}

export async function registerUser(
  input: z.infer<typeof registerSchema>
): Promise<ActionResult<{ userId: string }>> {
  try {
    await requireRole(Role.ADMIN);

    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const { name, email, password, role, classId, rollNo, phone } = parsed.data;

    const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return fail("Email already registered");

    if (role === Role.STUDENT && classId) {
      const cls = await db.class.findUnique({ where: { id: classId } });
      if (!cls) return fail("Class not found");

      const rollTaken = await db.studentProfile.findUnique({
        where: {
          classId_rollNo: {
            classId,
            rollNo: rollNo!.trim(),
          },
        },
      });
      if (rollTaken) return fail("Roll number already used in this class");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        hashedPassword,
        role,
        ...(role === Role.STUDENT && classId && rollNo
          ? {
              studentProfile: {
                create: {
                  classId,
                  rollNo: rollNo.trim(),
                  admissionDate: new Date(),
                },
              },
            }
          : {}),
        ...(role === Role.TEACHER ? { teacherProfile: { create: {} } } : {}),
        ...(role === Role.PARENT
          ? { parentProfile: { create: { phone: phone?.trim() || null } } }
          : {}),
      },
    });

    revalidateRegistrationPaths(role);
    return ok({ userId: user.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function getCurrentUser(): Promise<
  ActionResult<
    SessionUser & {
      createdAt: Date;
      studentProfile?: { id: string; classId: string; rollNo: string } | null;
      teacherProfile?: { id: string } | null;
      parentProfile?: { id: string; phone: string | null } | null;
    }
  >
> {
  try {
    const sessionUser = await requireAuth();

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        studentProfile: { select: { id: true, classId: true, rollNo: true } },
        teacherProfile: { select: { id: true } },
        parentProfile: { select: { id: true, phone: true } },
      },
    });

    if (!user) return fail("User not found");

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      studentProfileId: user.studentProfile?.id,
      teacherProfileId: user.teacherProfile?.id,
      parentProfileId: user.parentProfile?.id,
      createdAt: user.createdAt,
      studentProfile: user.studentProfile,
      teacherProfile: user.teacherProfile,
      parentProfile: user.parentProfile,
    });
  } catch (error) {
    return handleError(error);
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(2),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const adminResetPasswordSchema = z.object({
  userId: z.string(),
  newPassword: z.string().min(6),
});

export async function updateProfile(
  input: z.infer<typeof updateProfileSchema>
): Promise<ActionResult<void>> {
  try {
    const user = await requireAuth();
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    await db.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name.trim() },
    });

    revalidatePath("/profile");
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function changePassword(
  input: z.infer<typeof changePasswordSchema>
): Promise<ActionResult<void>> {
  try {
    const sessionUser = await requireAuth();
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { hashedPassword: true },
    });
    if (!user) return fail("User not found");

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.hashedPassword);
    if (!valid) return fail("Current password is incorrect");

    await db.user.update({
      where: { id: sessionUser.id },
      data: { hashedPassword: await bcrypt.hash(parsed.data.newPassword, 10) },
    });

    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function adminResetPassword(
  input: z.infer<typeof adminResetPasswordSchema>
): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = adminResetPasswordSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    if (parsed.data.userId === admin.id) {
      return fail("Use change password for your own account");
    }

    const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user) return fail("User not found");

    await db.user.update({
      where: { id: parsed.data.userId },
      data: { hashedPassword: await bcrypt.hash(parsed.data.newPassword, 10) },
    });

    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}
