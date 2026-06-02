"use server";

import { Role } from "@/lib/types/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { buildSessionUser } from "@/lib/auth/session";
import { getAdminAuth } from "@/lib/firebase/admin";
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

    const authUser = await getAdminAuth().createUser({
      email: email.toLowerCase(),
      password,
      displayName: name.trim(),
    });

    const user = await db.user.create({
      data: {
        id: authUser.uid,
        name: name.trim(),
        email: email.toLowerCase(),
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

    await buildSessionUser(authUser.uid);
    revalidateRegistrationPaths(role);
    return ok({ userId: user.id as string });
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

    const studentProfile = user.studentProfile as
      | { id: string; classId: string; rollNo: string }
      | null
      | undefined;
    const teacherProfile = user.teacherProfile as { id: string } | null | undefined;
    const parentProfile = user.parentProfile as
      | { id: string; phone: string | null }
      | null
      | undefined;

    return ok({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as Role,
      avatar: user.avatar as string | null | undefined,
      studentProfileId: studentProfile?.id,
      teacherProfileId: teacherProfile?.id,
      parentProfileId: parentProfile?.id,
      createdAt: user.createdAt as Date,
      studentProfile: studentProfile ?? null,
      teacherProfile: teacherProfile ?? null,
      parentProfile: parentProfile ?? null,
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

    await getAdminAuth().updateUser(user.id, { displayName: parsed.data.name.trim() });
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

    await getAdminAuth().updateUser(sessionUser.id, {
      password: parsed.data.newPassword,
    });

    return ok(undefined);
  } catch (error) {
    return fail("Could not update password");
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

    await getAdminAuth().updateUser(parsed.data.userId, {
      password: parsed.data.newPassword,
    });

    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}
