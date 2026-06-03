import { format, subDays } from "date-fns";
import { db } from "@/lib/db";
import { sendFeeReminder } from "@/lib/email/resend";
import { parseNotificationSettings } from "@/lib/school/settings";
import { FeeInvoiceStatus, NotificationType } from "@/lib/types/enums";

const REMINDER_COOLDOWN_DAYS = 7;

export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function syncOverdueInvoices(): Promise<number> {
  const today = startOfToday();

  const pendingInvoices = await db.feeInvoice.findMany({
    where: { status: FeeInvoiceStatus.PENDING },
    select: { id: true, dueDate: true },
  });

  const overdueIds = pendingInvoices
    .filter((invoice) => {
      const dueDate = new Date(invoice.dueDate as string | Date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .map((invoice) => invoice.id as string);

  if (overdueIds.length === 0) return 0;

  await Promise.all(
    overdueIds.map((id) =>
      db.feeInvoice.update({
        where: { id },
        data: { status: FeeInvoiceStatus.OVERDUE },
      })
    )
  );

  return overdueIds.length;
}

type InvoiceWithParents = {
  id: string;
  amount: number;
  status: string;
  dueDate: Date | string;
  description: string | null;
  lastReminderAt?: Date | string | null;
  student: {
    user: { name: string };
    parents: Array<{
      parent: {
        user: { id: string; email: string; name: string };
      };
    }>;
  };
};

async function notifyParentsOfInvoice(
  invoice: InvoiceWithParents,
  overdue: boolean
) {
  const dueLabel = format(new Date(invoice.dueDate), "MMM d, yyyy");
  const title = overdue ? "Overdue fee payment" : "Fee payment reminder";
  const body = overdue
    ? `₹${invoice.amount.toLocaleString("en-IN")} for ${invoice.student.user.name} was due on ${dueLabel}. Please pay as soon as possible.`
    : `₹${invoice.amount.toLocaleString("en-IN")} for ${invoice.student.user.name} is due on ${dueLabel}.`;

  for (const link of invoice.student.parents) {
    const parentUser = link.parent.user;

    if (process.env.RESEND_API_KEY) {
      await sendFeeReminder(
        parentUser.email,
        parentUser.name,
        invoice.amount,
        dueLabel,
        overdue
      );
    }

    await db.notification.create({
      data: {
        userId: parentUser.id,
        type: NotificationType.FEE_REMINDER,
        title,
        body,
        payload: { invoiceId: invoice.id, overdue },
      },
    });
  }

  await db.feeInvoice.update({
    where: { id: invoice.id },
    data: { lastReminderAt: new Date() },
  });
}

export type ProcessFeeRemindersResult = {
  synced: number;
  reminded: number;
  skipped: number;
};

export async function processFeeReminders(options?: {
  force?: boolean;
}): Promise<ProcessFeeRemindersResult> {
  const synced = await syncOverdueInvoices();

  const school = await db.school.findFirst();
  const settings = parseNotificationSettings(school?.settings);
  if (!settings.feeReminders) {
    return { synced, reminded: 0, skipped: 0 };
  }

  const today = startOfToday();
  const cooldown = subDays(new Date(), REMINDER_COOLDOWN_DAYS);

  const invoices = (await db.feeInvoice.findMany({
    where: {
      status: { in: [FeeInvoiceStatus.PENDING, FeeInvoiceStatus.OVERDUE] },
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          parents: {
            include: {
              parent: {
                include: {
                  user: { select: { id: true, email: true, name: true } },
                },
              },
            },
          },
        },
      },
    },
  })) as InvoiceWithParents[];

  let reminded = 0;
  let skipped = 0;

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const overdue =
      invoice.status === FeeInvoiceStatus.OVERDUE || dueDate < today;
    if (!overdue) {
      skipped++;
      continue;
    }

    const lastReminder = invoice.lastReminderAt
      ? new Date(invoice.lastReminderAt)
      : null;

    if (!options?.force && lastReminder && lastReminder >= cooldown) {
      skipped++;
      continue;
    }

    if (invoice.student.parents.length === 0) {
      skipped++;
      continue;
    }

    await notifyParentsOfInvoice(invoice, true);
    reminded++;
  }

  return { synced, reminded, skipped };
}
