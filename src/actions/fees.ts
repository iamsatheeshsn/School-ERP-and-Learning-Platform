"use server";

import { FeeInvoiceStatus, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { paymentProvider } from "@/lib/payments/razorpay";
import {
  assertCanAccessStudent,
  assertTeacherCanAccessClass,
  getParentChildren,
} from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const feeItemSchema = z.object({
  name: z.string(),
  amount: z.number().positive(),
});

const createFeeStructureSchema = z.object({
  classId: z.string(),
  name: z.string().min(1),
  items: z.array(feeItemSchema).min(1),
  dueDate: z.string(),
});

const generateInvoicesSchema = z.object({
  feeStructureId: z.string(),
  studentIds: z.array(z.string()).optional(),
});

const createPaymentOrderSchema = z.object({
  invoiceId: z.string(),
});

const confirmPaymentSchema = z.object({
  invoiceId: z.string(),
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateFeePaths() {
  revalidatePath("/admin/fees");
  revalidatePath("/parent/fees");
}

export async function createFeeStructure(
  input: z.infer<typeof createFeeStructureSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("fees:write");
    const parsed = createFeeStructureSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    if (user.role === Role.TEACHER) {
      await assertTeacherCanAccessClass(user, parsed.data.classId);
    }

    const totalAmount = parsed.data.items.reduce((sum, item) => sum + item.amount, 0);

    const structure = await db.feeStructure.create({
      data: {
        classId: parsed.data.classId,
        name: parsed.data.name,
        items: parsed.data.items,
        totalAmount,
        dueDate: new Date(parsed.data.dueDate),
      },
    });

    revalidateFeePaths();
    return ok({ id: structure.id });
  } catch (error) {
    return handleError(error);
  }
}

export async function generateInvoices(
  input: z.infer<typeof generateInvoicesSchema>
): Promise<ActionResult<{ created: number }>> {
  try {
    await requirePermission("fees:write");
    const parsed = generateInvoicesSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const structure = await db.feeStructure.findUnique({
      where: { id: parsed.data.feeStructureId },
    });
    if (!structure) return fail("Fee structure not found");

    let studentIds = parsed.data.studentIds ?? [];
    if (studentIds.length === 0) {
      const students = await db.studentProfile.findMany({
        where: { classId: structure.classId },
        select: { id: true },
      });
      studentIds = students.map((s) => s.id);
    }

    let created = 0;
    for (const studentId of studentIds) {
      const existing = await db.feeInvoice.findFirst({
        where: { studentId, feeStructureId: structure.id },
      });
      if (existing) continue;

      await db.feeInvoice.create({
        data: {
          studentId,
          feeStructureId: structure.id,
          amount: structure.totalAmount,
          dueDate: structure.dueDate,
          description: structure.name,
          status: FeeInvoiceStatus.PENDING,
        },
      });
      created++;
    }

    revalidateFeePaths();
    return ok({ created });
  } catch (error) {
    return handleError(error);
  }
}

export async function getInvoicesForParent(
  studentId?: string
): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("fees:read");
    if (user.role !== Role.PARENT || !user.parentProfileId) {
      throw new ForbiddenError();
    }

    const children = await getParentChildren(user.parentProfileId);
    const childIds = children.map((c) => c.id);

    if (studentId) {
      if (!childIds.includes(studentId)) throw new ForbiddenError();
    }

    const targetIds = studentId ? [studentId] : childIds;

    const invoices = await db.feeInvoice.findMany({
      where: { studentId: { in: targetIds } },
      include: {
        student: {
          include: { user: { select: { id: true, name: true } } },
        },
        feeStructure: { select: { id: true, name: true } },
        payments: true,
      },
      orderBy: { dueDate: "desc" },
    });

    return ok(invoices);
  } catch (error) {
    return handleError(error);
  }
}

export async function getInvoicesAdmin(filters?: {
  status?: FeeInvoiceStatus;
  classId?: string;
}): Promise<ActionResult<unknown[]>> {
  try {
    const user = await requirePermission("fees:read");
    if (user.role !== Role.ADMIN) throw new ForbiddenError();

    const invoices = await db.feeInvoice.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.classId
          ? { student: { classId: filters.classId } }
          : {}),
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            class: { select: { id: true, name: true } },
          },
        },
        feeStructure: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok(invoices);
  } catch (error) {
    return handleError(error);
  }
}

export async function createPaymentOrder(
  input: z.infer<typeof createPaymentOrderSchema>
): Promise<ActionResult<{ orderId: string; amount: number; currency: string; invoiceId: string }>> {
  try {
    const user = await requirePermission("fees:read");
    const parsed = createPaymentOrderSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const invoice = await db.feeInvoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { id: true, amount: true, status: true, studentId: true },
    });
    if (!invoice) return fail("Invoice not found");
    if (invoice.status === FeeInvoiceStatus.PAID) return fail("Invoice already paid");

    if (user.role === Role.PARENT) {
      await assertCanAccessStudent(user, invoice.studentId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const order = await paymentProvider.createOrder(invoice.id, invoice.amount);
    return ok(order);
  } catch (error) {
    return handleError(error);
  }
}

export async function confirmPayment(
  input: z.infer<typeof confirmPaymentSchema>
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const user = await requirePermission("fees:read");
    const parsed = confirmPaymentSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const invoice = await db.feeInvoice.findUnique({
      where: { id: parsed.data.invoiceId },
    });
    if (!invoice) return fail("Invoice not found");

    if (user.role === Role.PARENT) {
      await assertCanAccessStudent(user, invoice.studentId);
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenError();
    }

    const verified = await paymentProvider.verifyPayment(
      parsed.data.orderId,
      parsed.data.paymentId,
      parsed.data.signature
    );
    if (!verified) return fail("Payment verification failed");

    await db.$transaction([
      db.payment.create({
        data: {
          invoiceId: invoice.id,
          amount: invoice.amount,
          transactionRef: parsed.data.paymentId,
          gateway: "razorpay",
        },
      }),
      db.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          status: FeeInvoiceStatus.PAID,
          paidAt: new Date(),
        },
      }),
    ]);

    revalidateFeePaths();
    return ok({ invoiceId: invoice.id });
  } catch (error) {
    return handleError(error);
  }
}
