"use server";

import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, ForbiddenError, requireRole } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

export async function getAuditLogs(limit = 100): Promise<
  ActionResult<
    {
      id: string;
      actorName: string;
      action: string;
      entity: string;
      entityId: string | null;
      summary: string;
      createdAt: Date;
    }[]
  >
> {
  try {
    await requireRole(Role.ADMIN);

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
      select: {
        id: true,
        actorName: true,
        action: true,
        entity: true,
        entityId: true,
        summary: true,
        createdAt: true,
      },
    });

    return ok(logs);
  } catch (error) {
    return handleError(error);
  }
}

export async function getAuditLogsPaginated(input?: {
  page?: number;
  pageSize?: number;
}): Promise<
  ActionResult<{
    logs: {
      id: string;
      actorName: string;
      action: string;
      entity: string;
      entityId: string | null;
      summary: string;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  try {
    await requireRole(Role.ADMIN);
    const page = Math.max(1, input?.page ?? 1);
    const pageSize = Math.min(50, Math.max(5, input?.pageSize ?? 20));
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          actorName: true,
          action: true,
          entity: true,
          entityId: true,
          summary: true,
          createdAt: true,
        },
      }),
      db.auditLog.count(),
    ]);

    return ok({ logs, total, page, pageSize });
  } catch (error) {
    return handleError(error);
  }
}
