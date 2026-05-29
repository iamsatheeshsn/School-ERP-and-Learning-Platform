import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type AuditParams = {
  actorId: string;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  entity: string;
  entityId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        summary: params.summary,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Audit must not block primary operations.
  }
}
