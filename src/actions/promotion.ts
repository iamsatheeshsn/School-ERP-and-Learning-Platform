"use server";

import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit/log";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const promoteStudentsSchema = z.object({
  fromClassId: z.string(),
  toClassId: z.string(),
  studentProfileIds: z.array(z.string()).optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

export async function promoteStudents(
  input: z.infer<typeof promoteStudentsSchema>
): Promise<ActionResult<{ promoted: number; errors: string[] }>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = promoteStudentsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (parsed.data.fromClassId === parsed.data.toClassId) {
      return fail("Source and target class must be different");
    }

    const [fromClass, toClass] = await Promise.all([
      db.class.findUnique({ where: { id: parsed.data.fromClassId } }),
      db.class.findUnique({ where: { id: parsed.data.toClassId } }),
    ]);
    if (!fromClass || !toClass) return fail("Class not found");

    const students = await db.studentProfile.findMany({
      where: {
        classId: parsed.data.fromClassId,
        ...(parsed.data.studentProfileIds?.length
          ? { id: { in: parsed.data.studentProfileIds } }
          : {}),
      },
      include: { user: { select: { name: true } } },
      orderBy: { rollNo: "asc" },
    });

    if (students.length === 0) return fail("No students to promote");

    const targetRollNos = new Set(
      (
        await db.studentProfile.findMany({
          where: { classId: parsed.data.toClassId },
          select: { rollNo: true },
        })
      ).map((s) => s.rollNo)
    );

    let promoted = 0;
    const errors: string[] = [];

    for (const student of students) {
      if (targetRollNos.has(student.rollNo)) {
        errors.push(`${student.user.name}: roll ${student.rollNo} already exists in target class`);
        continue;
      }

      await db.studentProfile.update({
        where: { id: student.id },
        data: { classId: parsed.data.toClassId },
      });
      targetRollNos.add(student.rollNo);
      promoted += 1;
    }

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "UPDATE",
      entity: "StudentPromotion",
      summary: `Promoted ${promoted} students from ${fromClass.name} to ${toClass.name}`,
      metadata: {
        fromClassId: fromClass.id,
        toClassId: toClass.id,
        promoted,
        errors: errors.length,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/students");
    revalidatePath("/admin/classes");
    return ok({ promoted, errors });
  } catch (error) {
    return handleError(error);
  }
}
