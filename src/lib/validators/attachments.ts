import { z } from "zod";

export function isAttachmentUrl(value: string): boolean {
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

export const attachmentSchema = z.object({
  url: z
    .string()
    .min(1)
    .refine(isAttachmentUrl, { message: "Invalid attachment URL" }),
  name: z.string().min(1),
  size: z.number().optional(),
  type: z.string().optional(),
});

export function normalizeAttachments(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const parsed = attachmentSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}
