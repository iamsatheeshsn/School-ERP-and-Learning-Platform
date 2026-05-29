import { Prisma } from "@prisma/client";

export type NotificationSettings = {
  emailEnabled: boolean;
  attendanceAlerts: boolean;
  homeworkReminders: boolean;
  feeReminders: boolean;
  reportCardPublished: boolean;
  broadcastMessages: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  attendanceAlerts: true,
  homeworkReminders: true,
  feeReminders: true,
  reportCardPublished: true,
  broadcastMessages: true,
};

function readBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function parseNotificationSettings(raw: unknown): NotificationSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_NOTIFICATION_SETTINGS;

  const root = raw as Record<string, unknown>;
  const notifications = root.notifications;
  if (!notifications || typeof notifications !== "object") {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const n = notifications as Record<string, unknown>;
  return {
    emailEnabled: readBool(n.emailEnabled, DEFAULT_NOTIFICATION_SETTINGS.emailEnabled),
    attendanceAlerts: readBool(
      n.attendanceAlerts,
      DEFAULT_NOTIFICATION_SETTINGS.attendanceAlerts
    ),
    homeworkReminders: readBool(
      n.homeworkReminders,
      DEFAULT_NOTIFICATION_SETTINGS.homeworkReminders
    ),
    feeReminders: readBool(n.feeReminders, DEFAULT_NOTIFICATION_SETTINGS.feeReminders),
    reportCardPublished: readBool(
      n.reportCardPublished,
      DEFAULT_NOTIFICATION_SETTINGS.reportCardPublished
    ),
    broadcastMessages: readBool(
      n.broadcastMessages,
      DEFAULT_NOTIFICATION_SETTINGS.broadcastMessages
    ),
  };
}

export function mergeSchoolSettings(
  current: unknown,
  notifications: NotificationSettings
): Prisma.InputJsonObject {
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? { ...(current as Record<string, unknown>) }
      : {};

  return {
    ...base,
    notifications,
  };
}

export type IntegrationStatus = {
  id: string;
  name: string;
  description: string;
  configured: boolean;
};

function envConfigured(
  value: string | undefined,
  placeholders: string[] = []
): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  return !placeholders.some(
    (placeholder) =>
      trimmed === placeholder || trimmed.includes(placeholder)
  );
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicRazorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  return [
    {
      id: "gemini",
      name: "Google Gemini",
      description: "AI homework tutor and grading assistance",
      configured: envConfigured(process.env.GEMINI_API_KEY, [
        "your-gemini-api-key",
      ]),
    },
    {
      id: "resend",
      name: "Resend",
      description: "Transactional email delivery",
      configured: envConfigured(process.env.RESEND_API_KEY, ["re_..."]),
    },
    {
      id: "uploadthing",
      name: "UploadThing",
      description: "File uploads for messages and homework",
      configured: envConfigured(process.env.UPLOADTHING_TOKEN, [
        "your-uploadthing-v7-token",
      ]),
    },
    {
      id: "razorpay",
      name: "Razorpay",
      description: "Online fee payments",
      configured:
        envConfigured(razorpaySecret, ["your_secret_key"]) &&
        envConfigured(publicRazorpayKey, ["rzp_test_xxxxxxxx"]),
    },
  ];
}
