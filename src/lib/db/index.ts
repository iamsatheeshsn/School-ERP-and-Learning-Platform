import { createDbModels, deleteAllCollections } from "./firestore-model";
import { MODEL_DEFS } from "./schema";

const models = createDbModels();

function createModelProxy(name: string) {
  const model = models[name]!;
  return {
    findUnique: model.findUnique.bind(model),
    findFirst: model.findFirst.bind(model),
    findMany: model.findMany.bind(model),
    create: model.create.bind(model),
    createMany: model.createMany.bind(model),
    update: model.update.bind(model),
    updateMany: model.updateMany.bind(model),
    upsert: model.upsert.bind(model),
    delete: model.delete.bind(model),
    deleteMany: model.deleteMany.bind(model),
    count: model.count.bind(model),
    groupBy: model.groupBy.bind(model),
  };
}

type DbClient = ReturnType<typeof buildDb>;

function buildDb() {
  return {
    user: createModelProxy("user"),
    school: createModelProxy("school"),
    academicYear: createModelProxy("academicYear"),
    class: createModelProxy("class"),
    subject: createModelProxy("subject"),
    studentProfile: createModelProxy("studentProfile"),
    teacherProfile: createModelProxy("teacherProfile"),
    parentProfile: createModelProxy("parentProfile"),
    parentStudent: createModelProxy("parentStudent"),
    teacherClass: createModelProxy("teacherClass"),
    teacherSubject: createModelProxy("teacherSubject"),
    attendance: createModelProxy("attendance"),
    homework: createModelProxy("homework"),
    homeworkSubmission: createModelProxy("homeworkSubmission"),
    homeworkTutorSession: createModelProxy("homeworkTutorSession"),
    grade: createModelProxy("grade"),
    reportCard: createModelProxy("reportCard"),
    feeStructure: createModelProxy("feeStructure"),
    feeInvoice: createModelProxy("feeInvoice"),
    payment: createModelProxy("payment"),
    messageThread: createModelProxy("messageThread"),
    message: createModelProxy("message"),
    notification: createModelProxy("notification"),
    broadcast: createModelProxy("broadcast"),
    auditLog: createModelProxy("auditLog"),
    timetablePeriod: createModelProxy("timetablePeriod"),
    exam: createModelProxy("exam"),
    examResult: createModelProxy("examResult"),
    book: createModelProxy("book"),
    libraryIssue: createModelProxy("libraryIssue"),
    transportRoute: createModelProxy("transportRoute"),
    transportAssignment: createModelProxy("transportAssignment"),
    leaveRequest: createModelProxy("leaveRequest"),
  };
}

const dbCore = buildDb();

export const db = {
  ...dbCore,
  $transaction: async (
    arg: Array<Promise<unknown>> | ((tx: DbClient) => Promise<unknown>)
  ): Promise<unknown> => {
    if (typeof arg === "function") {
      return arg(dbCore);
    }
    return Promise.all(arg);
  },
};

export { deleteAllCollections, MODEL_DEFS };
