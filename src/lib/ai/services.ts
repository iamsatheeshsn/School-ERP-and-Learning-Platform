import { z } from "zod";
import { completeJson, completeText, checkRateLimit } from "@/lib/ai/client";
import {
  COHORT_INSIGHTS_SYSTEM,
  HOMEWORK_FEEDBACK_SYSTEM,
  HOMEWORK_GENERATION_SYSTEM,
  HOMEWORK_TUTOR_SYSTEM,
  PARENT_UPDATE_SYSTEM,
  REPORT_CARD_SYSTEM,
} from "@/lib/ai/prompts";

const feedbackSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  conceptualGaps: z.array(z.string()),
  suggestedGrade: z.number().min(0).max(100),
  summary: z.string(),
});

const worksheetSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  estimatedMinutes: z.number(),
});

const reportSchema = z.object({
  narrative: z.string(),
  strengths: z.array(z.string()),
  growthAreas: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const cohortSchema = z.object({
  insights: z.array(z.string()),
  atRiskStudents: z.array(
    z.object({
      studentName: z.string(),
      reasons: z.array(z.string()),
      recommendations: z.array(z.string()),
    })
  ),
  topPerformers: z.array(z.string()),
  classSummary: z.string(),
});

export function getTutorSystemPrompt(context: {
  title: string;
  description: string;
  subject: string;
}) {
  return HOMEWORK_TUTOR_SYSTEM(context);
}

export async function generateHomeworkFeedback(
  userId: string,
  input: { title: string; description: string; submission: string }
) {
  if (!checkRateLimit(`feedback:${userId}`)) {
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }
  return completeJson(
    HOMEWORK_FEEDBACK_SYSTEM,
    `Assignment: ${input.title}\n${input.description}\n\nStudent submission:\n${input.submission}`,
    feedbackSchema
  );
}

export async function generateHomeworkWorksheet(
  userId: string,
  input: { topic: string; difficulty: string; subject: string; grade: number }
) {
  if (!checkRateLimit(`worksheet:${userId}`)) {
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }
  return completeJson(
    HOMEWORK_GENERATION_SYSTEM,
    `Create homework for Grade ${input.grade} ${input.subject}. Topic: ${input.topic}. Difficulty: ${input.difficulty}.`,
    worksheetSchema
  );
}

export async function generateReportCardSummary(
  userId: string,
  input: {
    studentName: string;
    term: string;
    grades: { subject: string; score: number; maxScore: number }[];
    attendancePct: number;
    homeworkCompletionPct: number;
  }
) {
  if (!checkRateLimit(`report:${userId}`)) {
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }
  return completeJson(
    REPORT_CARD_SYSTEM,
    JSON.stringify(input, null, 2),
    reportSchema
  );
}

export async function draftParentUpdate(
  userId: string,
  input: {
    studentName: string;
    attendanceSummary: string;
    homeworkSummary: string;
    gradesSummary: string;
  }
) {
  if (!checkRateLimit(`parent:${userId}`)) {
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }
  return completeText(
    PARENT_UPDATE_SYSTEM,
    `Draft a message for ${input.studentName}'s parent.\nAttendance: ${input.attendanceSummary}\nHomework: ${input.homeworkSummary}\nGrades: ${input.gradesSummary}`
  );
}

export async function generateCohortInsights(userId: string, classData: unknown) {
  if (!checkRateLimit(`cohort:${userId}`)) {
    throw new Error("Rate limit exceeded. Please try again in a minute.");
  }
  return completeJson(
    COHORT_INSIGHTS_SYSTEM,
    JSON.stringify(classData, null, 2),
    cohortSchema
  );
}
