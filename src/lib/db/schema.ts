import type { CollectionName } from "./collections";

export type RelationDef = {
  model: string;
  foreignKey: string;
  localKey?: string;
  /** When true, reverse relation returns an array (one-to-many). Default: false */
  many?: boolean;
};

export type CountRelation = {
  model: string;
  foreignKey: string;
};

export type ModelDef = {
  collection: CollectionName;
  idField?: string;
  compoundUniques?: Record<string, string[]>;
  relations?: Record<string, RelationDef>;
  countRelations?: Record<string, CountRelation>;
  cascadeDelete?: string[];
};

export const MODEL_DEFS: Record<string, ModelDef> = {
  user: {
    collection: "users",
    relations: {
      studentProfile: { model: "studentProfile", foreignKey: "userId" },
      teacherProfile: { model: "teacherProfile", foreignKey: "userId" },
      parentProfile: { model: "parentProfile", foreignKey: "userId" },
    },
    cascadeDelete: ["studentProfile", "teacherProfile", "parentProfile"],
  },
  school: {
    collection: "schools",
    relations: {
      academicYears: { model: "academicYear", foreignKey: "schoolId", many: true },
      subjects: { model: "subject", foreignKey: "schoolId", many: true },
    },
  },
  academicYear: {
    collection: "academicYears",
    relations: {
      school: { model: "school", foreignKey: "id", localKey: "schoolId" },
      classes: { model: "class", foreignKey: "academicYearId", many: true },
      reportCards: { model: "reportCard", foreignKey: "academicYearId", many: true },
    },
  },
  class: {
    collection: "classes",
    compoundUniques: {
      academicYearId_grade_section: ["academicYearId", "grade", "section"],
    },
    relations: {
      academicYear: { model: "academicYear", foreignKey: "id", localKey: "academicYearId" },
      students: { model: "studentProfile", foreignKey: "classId", many: true },
    },
    countRelations: {
      students: { model: "studentProfile", foreignKey: "classId" },
    },
  },
  subject: {
    collection: "subjects",
    compoundUniques: { schoolId_code: ["schoolId", "code"] },
    countRelations: {
      homework: { model: "homework", foreignKey: "subjectId" },
      grades: { model: "grade", foreignKey: "subjectId" },
      teacherSubjects: { model: "teacherSubject", foreignKey: "subjectId" },
    },
  },
  studentProfile: {
    collection: "studentProfiles",
    compoundUniques: { classId_rollNo: ["classId", "rollNo"] },
    relations: {
      user: { model: "user", foreignKey: "id", localKey: "userId" },
      class: { model: "class", foreignKey: "id", localKey: "classId" },
      parents: { model: "parentStudent", foreignKey: "studentId", many: true },
    },
  },
  teacherProfile: {
    collection: "teacherProfiles",
    relations: {
      user: { model: "user", foreignKey: "id", localKey: "userId" },
      classes: { model: "teacherClass", foreignKey: "teacherId", many: true },
      subjects: { model: "teacherSubject", foreignKey: "teacherId", many: true },
    },
  },
  parentProfile: {
    collection: "parentProfiles",
    relations: {
      user: { model: "user", foreignKey: "id", localKey: "userId" },
      children: { model: "parentStudent", foreignKey: "parentId", many: true },
    },
  },
  parentStudent: {
    collection: "parentStudents",
    compoundUniques: { parentId_studentId: ["parentId", "studentId"] },
    relations: {
      parent: { model: "parentProfile", foreignKey: "id", localKey: "parentId" },
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
    },
  },
  teacherClass: {
    collection: "teacherClasses",
    compoundUniques: { teacherId_classId: ["teacherId", "classId"] },
    relations: {
      teacher: { model: "teacherProfile", foreignKey: "id", localKey: "teacherId" },
      class: { model: "class", foreignKey: "id", localKey: "classId" },
    },
  },
  teacherSubject: {
    collection: "teacherSubjects",
    compoundUniques: { teacherId_subjectId: ["teacherId", "subjectId"] },
    relations: {
      teacher: { model: "teacherProfile", foreignKey: "id", localKey: "teacherId" },
      subject: { model: "subject", foreignKey: "id", localKey: "subjectId" },
    },
  },
  attendance: {
    collection: "attendance",
    compoundUniques: { studentId_date: ["studentId", "dateKey"] },
    relations: {
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
      class: { model: "class", foreignKey: "id", localKey: "classId" },
      marker: { model: "user", foreignKey: "id", localKey: "markedBy" },
    },
  },
  homework: {
    collection: "homework",
    relations: {
      class: { model: "class", foreignKey: "id", localKey: "classId" },
      subject: { model: "subject", foreignKey: "id", localKey: "subjectId" },
      creator: { model: "user", foreignKey: "id", localKey: "createdBy" },
      submissions: { model: "homeworkSubmission", foreignKey: "homeworkId", many: true },
    },
  },
  homeworkSubmission: {
    collection: "homeworkSubmissions",
    compoundUniques: { homeworkId_studentId: ["homeworkId", "studentId"] },
    relations: {
      homework: { model: "homework", foreignKey: "id", localKey: "homeworkId" },
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
    },
  },
  homeworkTutorSession: {
    collection: "homeworkTutorSessions",
    compoundUniques: { homeworkId_studentId: ["homeworkId", "studentId"] },
  },
  grade: {
    collection: "grades",
    relations: {
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
      subject: { model: "subject", foreignKey: "id", localKey: "subjectId" },
    },
  },
  reportCard: {
    collection: "reportCards",
    compoundUniques: {
      studentId_academicYearId_term: ["studentId", "academicYearId", "term"],
    },
    relations: {
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
      academicYear: { model: "academicYear", foreignKey: "id", localKey: "academicYearId" },
    },
  },
  feeStructure: {
    collection: "feeStructures",
    relations: {
      class: { model: "class", foreignKey: "id", localKey: "classId" },
      invoices: { model: "feeInvoice", foreignKey: "feeStructureId", many: true },
    },
  },
  feeInvoice: {
    collection: "feeInvoices",
    relations: {
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
      feeStructure: { model: "feeStructure", foreignKey: "id", localKey: "feeStructureId" },
      payments: { model: "payment", foreignKey: "invoiceId", many: true },
    },
  },
  payment: {
    collection: "payments",
    relations: {
      invoice: { model: "feeInvoice", foreignKey: "id", localKey: "invoiceId" },
    },
  },
  messageThread: {
    collection: "messageThreads",
    compoundUniques: {
      studentId_teacherId_parentId: ["studentId", "teacherId", "parentId"],
    },
    relations: {
      student: { model: "studentProfile", foreignKey: "id", localKey: "studentId" },
      teacher: { model: "teacherProfile", foreignKey: "id", localKey: "teacherId" },
      parent: { model: "parentProfile", foreignKey: "id", localKey: "parentId" },
      messages: { model: "message", foreignKey: "threadId", many: true },
    },
  },
  message: {
    collection: "messages",
    relations: {
      thread: { model: "messageThread", foreignKey: "id", localKey: "threadId" },
      sender: { model: "user", foreignKey: "id", localKey: "senderId" },
      receiver: { model: "user", foreignKey: "id", localKey: "receiverId" },
    },
  },
  notification: {
    collection: "notifications",
    relations: {
      user: { model: "user", foreignKey: "id", localKey: "userId" },
    },
  },
  broadcast: { collection: "broadcasts" },
  auditLog: { collection: "auditLogs" },
  timetablePeriod: {
    collection: "timetablePeriods",
    relations: {
      class: { model: "class", foreignKey: "id", localKey: "classId" },
      subject: { model: "subject", foreignKey: "id", localKey: "subjectId" },
      teacher: { model: "teacherProfile", foreignKey: "id", localKey: "teacherId" },
    },
  },
};

export const MODEL_NAME_MAP: Record<string, string> = {
  user: "user",
  school: "school",
  academicYear: "academicYear",
  class: "class",
  subject: "subject",
  studentProfile: "studentProfile",
  teacherProfile: "teacherProfile",
  parentProfile: "parentProfile",
  parentStudent: "parentStudent",
  teacherClass: "teacherClass",
  teacherSubject: "teacherSubject",
  attendance: "attendance",
  homework: "homework",
  homeworkSubmission: "homeworkSubmission",
  homeworkTutorSession: "homeworkTutorSession",
  grade: "grade",
  reportCard: "reportCard",
  feeStructure: "feeStructure",
  feeInvoice: "feeInvoice",
  payment: "payment",
  messageThread: "messageThread",
  message: "message",
  notification: "notification",
  broadcast: "broadcast",
  auditLog: "auditLog",
  timetablePeriod: "timetablePeriod",
};
