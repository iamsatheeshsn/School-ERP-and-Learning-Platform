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

const updateStudentSchema = z.object({
  studentProfileId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  classId: z.string(),
  rollNo: z.string().min(1).max(20),
});

const updateUserSchema = z.object({
  userId: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
});

const updateParentSchema = updateUserSchema.extend({
  parentProfileId: z.string(),
  phone: z.string().optional(),
});

const updateClassSchema = z.object({
  classId: z.string(),
  name: z.string().min(2),
  grade: z.coerce.number().int().min(1).max(12),
  section: z.string().min(1).max(10),
});

const updateSubjectSchema = z.object({
  subjectId: z.string(),
  schoolId: z.string(),
  name: z.string().min(2),
  code: z.string().min(2).max(12),
});

const updateParentLinkSchema = z.object({
  linkId: z.string(),
  relation: z.string().min(2).max(30),
});

const idSchema = z.object({ id: z.string() });
const deleteUserSchema = z.object({ userId: z.string() });

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
  revalidatePath("/student/dashboard");
}

async function assertEmailAvailable(email: string, excludeUserId?: string) {
  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (existing && existing.id !== excludeUserId) {
    throw new Error("Email already registered");
  }
}

function prismaDeleteMessage(error: unknown): string {
  if (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: string }).code === "P2003"
  ) {
    return "Cannot delete: this record is linked to other data. Remove dependencies first.";
  }
  return error instanceof Error ? error.message : "Delete failed";
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

export async function updateStudent(
  input: z.infer<typeof updateStudentSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateStudentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const profile = await db.studentProfile.findUnique({
      where: { id: parsed.data.studentProfileId },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!profile) return fail("Student not found");

    const cls = await db.class.findUnique({ where: { id: parsed.data.classId } });
    if (!cls) return fail("Class not found");

    const rollTaken = await db.studentProfile.findFirst({
      where: {
        classId: parsed.data.classId,
        rollNo: parsed.data.rollNo.trim(),
        NOT: { id: parsed.data.studentProfileId },
      },
    });
    if (rollTaken) return fail("Roll number already used in this class");

    await assertEmailAvailable(parsed.data.email, profile.user.id);

    await db.$transaction([
      db.user.update({
        where: { id: profile.user.id },
        data: {
          name: parsed.data.name.trim(),
          email: parsed.data.email.toLowerCase(),
        },
      }),
      db.studentProfile.update({
        where: { id: parsed.data.studentProfileId },
        data: {
          classId: parsed.data.classId,
          rollNo: parsed.data.rollNo.trim(),
        },
      }),
    ]);

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteStudent(input: {
  studentProfileId: string;
}): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const profile = await db.studentProfile.findUnique({
      where: { id: input.studentProfileId },
      select: { userId: true },
    });
    if (!profile) return fail("Student not found");
    if (profile.userId === admin.id) return fail("You cannot delete your own account");

    await db.user.delete({ where: { id: profile.userId } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return fail(prismaDeleteMessage(error));
  }
}

export async function updateTeacher(
  input: z.infer<typeof updateUserSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user || user.role !== Role.TEACHER) return fail("Teacher not found");

    await assertEmailAvailable(parsed.data.email, parsed.data.userId);

    await db.user.update({
      where: { id: parsed.data.userId },
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase(),
      },
    });

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteTeacher(
  input: z.infer<typeof deleteUserSchema>
): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = deleteUserSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid input");
    if (parsed.data.userId === admin.id) return fail("You cannot delete your own account");

    const user = await db.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user || user.role !== Role.TEACHER) return fail("Teacher not found");

    const homeworkCount = await db.homework.count({
      where: { createdBy: parsed.data.userId },
    });
    if (homeworkCount > 0) {
      return fail("Cannot delete teacher who has created homework");
    }

    await db.user.delete({ where: { id: parsed.data.userId } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return fail(prismaDeleteMessage(error));
  }
}

export async function updateParent(
  input: z.infer<typeof updateParentSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateParentSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const parent = await db.parentProfile.findUnique({
      where: { id: parsed.data.parentProfileId },
      include: { user: true },
    });
    if (!parent || parent.user.role !== Role.PARENT) return fail("Parent not found");

    await assertEmailAvailable(parsed.data.email, parsed.data.userId);

    await db.$transaction([
      db.user.update({
        where: { id: parsed.data.userId },
        data: {
          name: parsed.data.name.trim(),
          email: parsed.data.email.toLowerCase(),
        },
      }),
      db.parentProfile.update({
        where: { id: parsed.data.parentProfileId },
        data: { phone: parsed.data.phone?.trim() || null },
      }),
    ]);

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteParent(input: {
  parentProfileId: string;
}): Promise<ActionResult<void>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parent = await db.parentProfile.findUnique({
      where: { id: input.parentProfileId },
      select: { userId: true },
    });
    if (!parent) return fail("Parent not found");
    if (parent.userId === admin.id) return fail("You cannot delete your own account");

    await db.user.delete({ where: { id: parent.userId } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return fail(prismaDeleteMessage(error));
  }
}

export async function updateClassRecord(
  input: z.infer<typeof updateClassSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateClassSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const existing = await db.class.findUnique({
      where: { id: parsed.data.classId },
    });
    if (!existing) return fail("Class not found");

    const section = parsed.data.section.trim().toUpperCase();
    const conflict = await db.class.findFirst({
      where: {
        academicYearId: existing.academicYearId,
        grade: parsed.data.grade,
        section,
        NOT: { id: parsed.data.classId },
      },
    });
    if (conflict) {
      return fail(`Grade ${parsed.data.grade}-${section} already exists for this year`);
    }

    await db.class.update({
      where: { id: parsed.data.classId },
      data: {
        name: parsed.data.name.trim(),
        grade: parsed.data.grade,
        section,
      },
    });

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteClassRecord(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid input");

    const cls = await db.class.findUnique({
      where: { id: parsed.data.id },
      include: { _count: { select: { students: true } } },
    });
    if (!cls) return fail("Class not found");
    if (cls._count.students > 0) {
      return fail("Cannot delete a class that still has enrolled students");
    }

    await db.class.delete({ where: { id: parsed.data.id } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return fail(prismaDeleteMessage(error));
  }
}

export async function updateSubjectRecord(
  input: z.infer<typeof updateSubjectSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateSubjectSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const subject = await db.subject.findUnique({
      where: { id: parsed.data.subjectId },
    });
    if (!subject || subject.schoolId !== parsed.data.schoolId) {
      return fail("Subject not found");
    }

    const code = parsed.data.code.trim().toUpperCase();
    const conflict = await db.subject.findFirst({
      where: {
        schoolId: parsed.data.schoolId,
        code,
        NOT: { id: parsed.data.subjectId },
      },
    });
    if (conflict) return fail(`Subject code "${code}" is already in use`);

    await db.subject.update({
      where: { id: parsed.data.subjectId },
      data: {
        name: parsed.data.name.trim(),
        code,
      },
    });

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSubjectRecord(
  input: z.infer<typeof idSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = idSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid input");

    const subject = await db.subject.findUnique({
      where: { id: parsed.data.id },
      include: {
        _count: { select: { homework: true, grades: true, teacherSubjects: true } },
      },
    });
    if (!subject) return fail("Subject not found");

    const inUse =
      subject._count.homework + subject._count.grades + subject._count.teacherSubjects;
    if (inUse > 0) {
      return fail("Cannot delete a subject that is assigned or has records");
    }

    await db.subject.delete({ where: { id: parsed.data.id } });
    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return fail(prismaDeleteMessage(error));
  }
}

export async function updateParentLink(
  input: z.infer<typeof updateParentLinkSchema>
): Promise<ActionResult<void>> {
  try {
    await requireRole(Role.ADMIN);
    const parsed = updateParentLinkSchema.safeParse(input);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const link = await db.parentStudent.findUnique({
      where: { id: parsed.data.linkId },
    });
    if (!link) return fail("Link not found");

    await db.parentStudent.update({
      where: { id: parsed.data.linkId },
      data: { relation: parsed.data.relation.trim() },
    });

    revalidateUserPaths();
    return ok(undefined);
  } catch (error) {
    return handleError(error);
  }
}
