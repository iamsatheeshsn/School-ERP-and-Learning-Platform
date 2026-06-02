export enum Role {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
  PARENT = "PARENT",
  STUDENT = "STUDENT",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  EXCUSED = "EXCUSED",
}

export enum HomeworkSubmissionStatus {
  PENDING = "PENDING",
  SUBMITTED = "SUBMITTED",
  GRADED = "GRADED",
  RETURNED = "RETURNED",
}

export enum FeeInvoiceStatus {
  PAID = "PAID",
  PENDING = "PENDING",
  OVERDUE = "OVERDUE",
}

export enum ReportCardStatus {
  DRAFT = "DRAFT",
  REVIEW = "REVIEW",
  PUBLISHED = "PUBLISHED",
}

export enum NotificationType {
  ATTENDANCE_ALERT = "ATTENDANCE_ALERT",
  HOMEWORK = "HOMEWORK",
  FEE_REMINDER = "FEE_REMINDER",
  MESSAGE = "MESSAGE",
  BROADCAST = "BROADCAST",
  REPORT_CARD = "REPORT_CARD",
  EXAM_RESULT = "EXAM_RESULT",
  LIBRARY = "LIBRARY",
  TRANSPORT = "TRANSPORT",
  LEAVE = "LEAVE",
  GENERAL = "GENERAL",
}

export enum ExamType {
  UNIT_TEST = "UNIT_TEST",
  MIDTERM = "MIDTERM",
  FINAL = "FINAL",
  QUIZ = "QUIZ",
  ASSIGNMENT = "ASSIGNMENT",
}

export enum ExamStatus {
  SCHEDULED = "SCHEDULED",
  PUBLISHED = "PUBLISHED",
}

export enum LibraryIssueStatus {
  ISSUED = "ISSUED",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum LeaveType {
  CASUAL = "CASUAL",
  SICK = "SICK",
  EARNED = "EARNED",
  OTHER = "OTHER",
}
