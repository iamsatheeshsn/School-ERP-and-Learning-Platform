"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const createClassSchema = z.object({
  academicYearId: z.string(),
  grade: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1).max(10),
  name: z.string().optional(),
});

const createSubjectSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(2),
  code: z.string().min(2).max(12),
});

const linkParentStudentSchema = z.object({
  parentId: z.string(),
  studentId: z.string(),
  relation: z.string().min(2).max(30),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateUserPaths() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  revalidatePath("/admin/classes");
  revalidatePath("/parent/dashboard");
  revalidatePath("/teacher/dashboard");
}

export async function createClass(
  input: z.infer<typeof createClassSchema>
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = createClassSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const year = await db.academicYear.findUnique({
      where: { id: parsed.data.academicYearId },
    });
    if (!year) return fail("Academic year not found");

    const section = parsed.data.section.trim().toUpperCase();
    const name =
      parsed.data.name?.trim() ||
      `Grade ${parsed.data.grade}-${section}`;

    const existing = await db.class.findUnique({
      where: {
        academicYearId_grade_section: {
          academicYearId: parsed.data.academicYearId,
          grade: parsed.data.grade,
          section,
        },
      },
    });
    if (existing) {
      return fail(`Class Grade ${parsed.data.grade}-${section} already exists for this year`);
    }

    const created = await db.class.create({
      data: {
        academicYearId: parsed.data.academicYearId,
        grade: parsed.data.grade,
        section,
        name,
      },
    });

    revalidateUserPaths();
    return ok({ id: created.id, name: created.name });
  } catch (error) {
    return handleError(error);
  }
}

export async function createSubject(
  input: z.infer<typeof createSubjectSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = createSubjectSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const school = await db.school.findUnique({
      where: { id: parsed.data.schoolId },
    });
    if (!school) return fail("School not found");

    const code = parsed.data.code.trim().toUpperCase();
    const existing = await db.subject.findUnique({
      where: {
        schoolId_code: {
          schoolId: parsed.data.schoolId,
          code,
        },
      },
    });
    if (existing) return fail(`Subject code "${code}" is already in use`);

    const subject = await db.subject.create({
      data: {
        schoolId: parsed.data.schoolId,
        name: parsed.data.name.trim(),
        code,
      },
    });

    revalidateUserPaths();
    return ok({ id: subject.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function linkParentToStudent(
  input: z.infer<typeof linkParentStudentSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = linkParentStudentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const [parent, student] = await Promise.all([
      db.parentProfile.findUnique({
        where: { id: parsed.data.parentId },
        include: { user: { select: { name: true } } },
      }),
      db.studentProfile.findUnique({
        where: { id: parsed.data.studentId },
        include: { user: { select: { name: true } } },
      }),
    ]);

    if (!parent) return fail("Parent not found");
    if (!student) return fail("Student not found");

    const existing = await db.parentStudent.findUnique({
      where: {
        parentId_studentId: {
          parentId: parsed.data.parentId,
          studentId: parsed.data.studentId,
        },
      },
    });
    if (existing) {
      return fail(`${parent.user.name} is already linked to ${student.user.name}`);
    }

    const link = await db.parentStudent.create({
      data: {
        parentId: parsed.data.parentId,
        studentId: parsed.data.studentId,
        relation: parsed.data.relation.trim(),
      },
    });

    revalidateUserPaths();
    return ok({ id: link.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function unlinkParentFromStudent(input: {
  linkId: string;
}): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const link = await db.parentStudent.findUnique({
      where: { id: input.linkId },
    });
    if (!link) return fail("Link not found");

    await db.parentStudent.delete({ where: { id: input.linkId } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}
