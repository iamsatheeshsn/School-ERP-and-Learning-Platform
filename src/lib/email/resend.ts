import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const from = process.env.RESEND_FROM_EMAIL ?? "ScholarOS <onboarding@resend.dev>";

export async function sendEmail(to: string, subject: string, html: string) {
  const client = getResend();
  if (!client) {
    console.warn("[email] RESEND_API_KEY not set, skipping:", subject, "→", to);
    return { id: "skipped" };
  }
  return client.emails.send({ from, to, subject, html });
}

export async function sendAbsenceAlert(
  to: string,
  parentName: string,
  studentName: string,
  date: string
) {
  return sendEmail(
    to,
    `Absence Alert: ${studentName}`,
    `<p>Dear ${parentName},</p><p>${studentName} was marked <strong>absent</strong> on ${date}.</p><p>Please contact the school if this is incorrect.</p><p>— ScholarOS</p>`
  );
}

export async function sendFeeReminder(to: string, parentName: string, amount: number, dueDate: string) {
  return sendEmail(
    to,
    "Fee Payment Reminder",
    `<p>Dear ${parentName},</p><p>You have an outstanding fee of <strong>₹${amount.toLocaleString("en-IN")}</strong> due by ${dueDate}.</p><p>Log in to ScholarOS to pay online.</p>`
  );
}

export async function sendReportCardPublished(
  to: string,
  parentName: string,
  studentName: string,
  term: string
) {
  return sendEmail(
    to,
    `Report Card Published — ${studentName}`,
    `<p>Dear ${parentName},</p><p>The ${term} report card for ${studentName} is now available in your ScholarOS parent portal.</p>`
  );
}

export async function sendBroadcast(to: string[], title: string, body: string) {
  const results = await Promise.allSettled(
    to.map((email) =>
      sendEmail(email, title, `<p>${body.replace(/\n/g, "<br/>")}</p><p>— ScholarOS</p>`)
    )
  );
  return results;
}
