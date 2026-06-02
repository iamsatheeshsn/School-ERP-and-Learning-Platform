"use server";

import { addDays, differenceInCalendarDays } from "date-fns";
import { LibraryIssueStatus, NotificationType, Role } from "@/lib/types/enums";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCanAccessStudent, getParentChildren } from "@/lib/queries/students";
import { AuthError, ForbiddenError, requirePermission } from "@/lib/rbac/guards";
import { ok, fail, type ActionResult } from "@/lib/types";

const LIBRARY_FINE_PER_DAY = 10;
const DEFAULT_LOAN_DAYS = 14;

const createBookSchema = z.object({
  schoolId: z.string(),
  title: z.string().min(1),
  author: z.string().min(1),
  isbn: z.string().optional(),
  category: z.string().optional(),
  totalCopies: z.number().int().min(1),
});

const issueBookSchema = z.object({
  bookId: z.string(),
  studentId: z.string(),
  dueDate: z.string().optional(),
});

function handleError(error: unknown): ActionResult<never> {
  if (error instanceof AuthError) return fail("Unauthorized");
  if (error instanceof ForbiddenError) return fail("Forbidden");
  if (error instanceof Error) return fail(error.message);
  return fail("Something went wrong");
}

function revalidateLibraryPaths() {
  revalidatePath("/admin/library");
  revalidatePath("/student/library");
  revalidatePath("/parent/library");
}

export async function createBook(
  input: z.infer<typeof createBookSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("library:write");
    const parsed = createBookSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const book = await db.book.create({
      data: {
        ...parsed.data,
        isbn: parsed.data.isbn ?? "",
        category: parsed.data.category ?? "General",
        availableCopies: parsed.data.totalCopies,
      },
    });

    revalidateLibraryPaths();
    return ok({ id: book.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function getBooksAdmin(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("library:write");
    const books = await db.book.findMany({
      orderBy: [{ title: "asc" }],
    });
    return ok(books);
  } catch (error) {
    return handleError(error);
  }
}

export async function getLibraryIssuesAdmin(): Promise<ActionResult<unknown[]>> {
  try {
    await requirePermission("library:write");
    const issues = await db.libraryIssue.findMany({
      where: { status: { in: [LibraryIssueStatus.ISSUED, LibraryIssueStatus.OVERDUE] } },
      include: {
        book: { select: { title: true, author: true } },
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: [{ dueAt: "asc" }],
    });
    return ok(issues);
  } catch (error) {
    return handleError(error);
  }
}

export async function issueBook(
  input: z.infer<typeof issueBookSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    await requirePermission("library:write");
    const parsed = issueBookSchema.safeParse(input);
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid input");

    const book = await db.book.findUnique({ where: { id: parsed.data.bookId } });
    if (!book) return fail("Book not found");
    if ((book.availableCopies as number) <= 0) return fail("No copies available");

    const activeIssue = await db.libraryIssue.findFirst({
      where: {
        bookId: parsed.data.bookId,
        studentId: parsed.data.studentId,
        status: { in: [LibraryIssueStatus.ISSUED, LibraryIssueStatus.OVERDUE] },
      },
    });
    if (activeIssue) return fail("Student already has this book issued");

    const dueAt = parsed.data.dueDate
      ? new Date(parsed.data.dueDate)
      : addDays(new Date(), DEFAULT_LOAN_DAYS);

    const issue = await db.libraryIssue.create({
      data: {
        bookId: parsed.data.bookId,
        studentId: parsed.data.studentId,
        issuedAt: new Date(),
        dueAt,
        status: LibraryIssueStatus.ISSUED,
        fineAmount: 0,
      },
    });

    await db.book.update({
      where: { id: parsed.data.bookId },
      data: { availableCopies: (book.availableCopies as number) - 1 },
    });

    const student = await db.studentProfile.findUnique({
      where: { id: parsed.data.studentId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (student) {
      await db.notification.create({
        data: {
          userId: (student.user as { id: string }).id,
          type: NotificationType.LIBRARY,
          title: "Book issued",
          body: `"${book.title}" is due on ${dueAt.toLocaleDateString()}.`,
        },
      });
    }

    revalidateLibraryPaths();
    return ok({ id: issue.id as string });
  } catch (error) {
    return handleError(error);
  }
}

export async function returnBook(issueId: string): Promise<ActionResult<{ fineAmount: number }>> {
  try {
    await requirePermission("library:write");

    const issue = await db.libraryIssue.findUnique({
      where: { id: issueId },
      include: {
        book: true,
        student: { include: { user: { select: { id: true } } } },
      },
    });
    if (!issue) return fail("Issue record not found");
    if (issue.status === LibraryIssueStatus.RETURNED) return fail("Already returned");

    const returnedAt = new Date();
    const daysLate = Math.max(0, differenceInCalendarDays(returnedAt, new Date(issue.dueAt as Date)));
    const fineAmount = daysLate * LIBRARY_FINE_PER_DAY;

    await db.libraryIssue.update({
      where: { id: issueId },
      data: {
        returnedAt,
        status: LibraryIssueStatus.RETURNED,
        fineAmount,
      },
    });

    await db.book.update({
      where: { id: issue.bookId },
      data: { availableCopies: (issue.book.availableCopies as number) + 1 },
    });

    if (fineAmount > 0) {
      await db.notification.create({
        data: {
          userId: (issue.student.user as { id: string }).id,
          type: NotificationType.LIBRARY,
          title: "Library overdue fine",
          body: `Fine of ₹${fineAmount} for late return (${daysLate} day(s)).`,
        },
      });
    }

    revalidateLibraryPaths();
    return ok({ fineAmount });
  } catch (error) {
    return handleError(error);
  }
}

export async function getStudentLibraryIssues(
  studentId?: string
): Promise<ActionResult<unknown>> {
  try {
    const user = await requirePermission("library:read");
    let targetId = studentId;

    if (user.role === Role.STUDENT) {
      targetId = user.studentProfileId ?? undefined;
    }

    if (user.role === Role.PARENT && user.parentProfileId && !targetId) {
      const children = await getParentChildren(user.parentProfileId);
      const groups = await Promise.all(
        children.map(async (child) => ({
          student: child,
          issues: await db.libraryIssue.findMany({
            where: {
              studentId: child.id,
              status: { in: [LibraryIssueStatus.ISSUED, LibraryIssueStatus.OVERDUE, LibraryIssueStatus.RETURNED] },
            },
            include: { book: { select: { title: true, author: true } } },
            orderBy: [{ issuedAt: "desc" }],
            take: 10,
          }),
        }))
      );
      return ok(groups);
    }

    if (!targetId) return fail("Student not specified");
    await assertCanAccessStudent(user, targetId);

    const issues = await db.libraryIssue.findMany({
      where: { studentId: targetId },
      include: { book: { select: { title: true, author: true } } },
      orderBy: [{ issuedAt: "desc" }],
    });

    return ok(issues);
  } catch (error) {
    return handleError(error);
  }
}

export async function getLibraryContext(): Promise<
  ActionResult<{
    schoolId: string;
    books: unknown[];
    students: { id: string; name: string; className: string }[];
  }>
> {
  try {
    await requirePermission("library:write");
    const school = await db.school.findFirst();
    if (!school) return fail("School not found");

    const [books, students] = await Promise.all([
      db.book.findMany({ where: { schoolId: school.id }, orderBy: [{ title: "asc" }] }),
      db.studentProfile.findMany({
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
        orderBy: [{ class: { name: "asc" } }, { rollNo: "asc" }],
      }),
    ]);

    return ok({
      schoolId: school.id as string,
      books,
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
