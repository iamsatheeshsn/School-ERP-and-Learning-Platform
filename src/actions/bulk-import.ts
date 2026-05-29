"use server";

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { registerUser } from "@/actions/auth";
import { linkParentToStudent } from "@/actions/users";
import { writeAuditLog } from "@/lib/audit/log";
import { csvRowsToObjects, parseCsv } from "@/lib/csv/parse";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const bulkStudentsSchema = z.object({
  csv: z.string().min(1),
  defaultPassword: z.string().min(6).optional(),
});

const bulkParentsSchema = z.object({
  csv: z.string().min(1),
  defaultPassword: z.string().min(6).optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateImportPaths() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
}

export async function bulkImportStudents(
  input: z.infer<typeof bulkStudentsSchema>
): Promise<ActionResult<{ created: number; errors: string[] }>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = bulkStudentsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const password = parsed.data.defaultPassword ?? "password123";
    const rows = csvRowsToObjects<{
      name: string;
      email: string;
      class: string;
      rollno: string;
    }>(parseCsv(parsed.data.csv), ["name", "email", "class", "rollno"]);

    if (rows.length === 0) return fail("CSV has no data rows");

    const classes = await db.class.findMany({ select: { id: true, name: true } });
    const classByName = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]));

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      const line = i + 2;
      const classId = classByName.get(row.class.trim().toLowerCase());
      if (!classId) {
        errors.push(`Row ${line}: class "${row.class}" not found`);
        continue;
      }

      const result = await registerUser({
        name: row.name,
        email: row.email,
        password,
        role: Role.STUDENT,
        classId,
        rollNo: row.rollno,
      });

      if (result.success) {
        created += 1;
      } else {
        errors.push(`Row ${line}: ${result.error}`);
      }
    }

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "CREATE",
      entity: "StudentBulkImport",
      summary: `Bulk imported ${created} students (${errors.length} errors)`,
      metadata: { created, errorCount: errors.length },
    });

    revalidateImportPaths();
    return ok({ created, errors });
  } catch (error) {
    return handleError(error);
  }
}

export async function bulkImportParents(
  input: z.infer<typeof bulkParentsSchema>
): Promise<ActionResult<{ created: number; linked: number; errors: string[] }>> {
  try {
    const admin = await requireRole(Role.ADMIN);
    const parsed = bulkParentsSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const password = parsed.data.defaultPassword ?? "password123";
    const rows = csvRowsToObjects<{
      name: string;
      email: string;
      phone: string;
      studentemail: string;
      relation: string;
    }>(parseCsv(parsed.data.csv), [
      "name",
      "email",
      "phone",
      "studentemail",
      "relation",
    ]);

    if (rows.length === 0) return fail("CSV has no data rows");

    let created = 0;
    let linked = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i]!;
      const line = i + 2;

      const result = await registerUser({
        name: row.name,
        email: row.email,
        password,
        role: Role.PARENT,
        phone: row.phone || undefined,
      });

      if (!result.success) {
        errors.push(`Row ${line}: ${result.error}`);
        continue;
      }

      created += 1;

      if (!row.studentemail.trim()) continue;

      const studentUser = await db.user.findUnique({
        where: { email: row.studentemail.trim().toLowerCase() },
        include: { studentProfile: true, parentProfile: true },
      });

      if (!studentUser?.studentProfile) {
        errors.push(`Row ${line}: student email "${row.studentemail}" not found`);
        continue;
      }

      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: result.data.userId },
      });
      if (!parentProfile) continue;

      const linkResult = await linkParentToStudent({
        parentId: parentProfile.id,
        studentId: studentUser.studentProfile.id,
        relation: row.relation.trim() || "Parent",
      });

      if (linkResult.success) linked += 1;
      else errors.push(`Row ${line} link: ${linkResult.error}`);
    }

    await writeAuditLog({
      actorId: admin.id,
      actorName: admin.name,
      action: "CREATE",
      entity: "ParentBulkImport",
      summary: `Bulk imported ${created} parents, ${linked} links`,
      metadata: { created, linked, errorCount: errors.length },
    });

    revalidateImportPaths();
    return ok({ created, linked, errors });
  } catch (error) {
    return handleError(error);
  }
}
