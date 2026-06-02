"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCanAccessStudent, getParentChildren } from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";
import { Role } from "@/lib/types/enums";

const stopSchema = z.object({
  name: z.string().min(1),
  pickupTime: z.string().min(1),
});

const createRouteSchema = z.object({
  schoolId: z.string(),
  name: z.string().min(1),
  vehicleNumber: z.string().min(1),
  driverName: z.string().min(1),
  driverPhone: z.string().min(1),
  stops: z.array(stopSchema).min(1),
});

const assignStudentSchema = z.object({
  routeId: z.string(),
  stopName: z.string().min(1),
  studentId: z.string(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateTransportPaths() {
  revalidatePath("/admin/transport");
  revalidatePath("/parent/transport");
  revalidatePath("/student/transport");
}

export async function createTransportRoute(
  input: z.infer<typeof createRouteSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("transport:write");
    const parsed = createRouteSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const route = await db.transportRoute.create({
      data: {
        ...parsed.data,
        active: true,
      },
    });

    revalidateTransportPaths();
    return ok({ id: route.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function getTransportRoutesAdmin(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("transport:write");
    const routes = await db.transportRoute.findMany({
      include: {
        assignments: {
          include: {
            student: {
              include: {
                user: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });
    return ok(routes);
  } catch (error) {
    return handleError(error);
  }
}

export async function assignStudentToRoute(
  input: z.infer<typeof assignStudentSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("transport:write");
    const parsed = assignStudentSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const route = await db.transportRoute.findUnique({ where: { id: parsed.data.routeId } });
    if (!route) return fail("Route not found");

    const stops = route.stops as { name: string; pickupTime: string }[];
    if (!stops.some((s) => s.name === parsed.data.stopName)) {
      return fail("Invalid stop for this route");
    }

    const existing = await db.transportAssignment.findFirst({
      where: { studentId: parsed.data.studentId },
    });

    if (existing) {
      await db.transportAssignment.update({
        where: { id: existing.id },
        data: {
          routeId: parsed.data.routeId,
          stopName: parsed.data.stopName,
        },
      });
      revalidateTransportPaths();
      return ok({ id: existing.id as string });
    }

    const assignment = await db.transportAssignment.create({
      data: parsed.data,
    });

    revalidateTransportPaths();
    return ok({ id: assignment.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function getTransportContext(): Promise<
  ActionResult<{
    schoolId: string;
    routes: unknown[];
    students: { id: string; name: string; className: string }[];
  }>
> {
  try {
    await requirePermission("transport:write");
    const school = await db.school.findFirst();
    if (!school) return fail("School not found");

    const [routes, students] = await Promise.all([
      db.transportRoute.findMany({ where: { schoolId: school.id, active: true } }),
      db.studentProfile.findMany({
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
        orderBy: [{ rollNo: "asc" }],
      }),
    ]);

    return ok({
      schoolId: school.id as string,
      routes,
      students: students.map((s) => ({
        id: s.id as string,
        name: (s.user as { name: string }).name,
        className: (s.class as { name: string }).name,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function getStudentTransport(
  studentId?: string
): Promise<ActionResult<unknown>> {
  try {
    const user = await requirePermission("transport:read");
    let targetId = studentId;

    if (user.role === Role.STUDENT) {
      targetId = user.studentProfileId ?? undefined;
    }

    if (user.role === Role.PARENT && user.parentProfileId && !targetId) {
      const children = await getParentChildren(user.parentProfileId);
      const groups = await Promise.all(
        children.map(async (child) => {
          const assignment = await db.transportAssignment.findFirst({
            where: { studentId: child.id },
            include: { route: true },
          });
          return { student: child, assignment };
        })
      );
      return ok(groups);
    }

    if (!targetId) return fail("Student not specified");
    await assertCanAccessStudent(user, targetId);

    const assignment = await db.transportAssignment.findFirst({
      where: { studentId: targetId },
      include: { route: true },
    });

    return ok(assignment);
  } catch (error) {
    return handleError(error);
  }
}
