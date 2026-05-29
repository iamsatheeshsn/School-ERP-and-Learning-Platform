import {
  PrismaClient,
  Role,
  AttendanceStatus,
  HomeworkSubmissionStatus,
  FeeInvoiceStatus,
  ReportCardStatus,
  ExamType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, addDays } from "date-fns";

const db = new PrismaClient();
const PASSWORD = "password123";
const hash = () => bcrypt.hash(PASSWORD, 10);

const FIRST_NAMES = [
  "Aarav", "Vihaan", "Ananya", "Diya", "Arjun", "Isha", "Rohan", "Priya",
  "Karan", "Meera", "Aditya", "Sneha", "Rahul", "Kavya", "Dev", "Nisha",
  "Vikram", "Pooja", "Sanjay", "Riya", "Amit", "Tanvi", "Nikhil", "Aisha",
  "Varun", "Simran", "Harsh", "Neha", "Yash", "Ira",
];

async function main() {
  console.log("🌱 Seeding ScholarOS database...");

  await db.notification.deleteMany();
  await db.message.deleteMany();
  await db.messageThread.deleteMany();
  await db.broadcast.deleteMany();
  await db.payment.deleteMany();
  await db.feeInvoice.deleteMany();
  await db.feeStructure.deleteMany();
  await db.reportCard.deleteMany();
  await db.grade.deleteMany();
  await db.homeworkTutorSession.deleteMany();
  await db.homeworkSubmission.deleteMany();
  await db.homework.deleteMany();
  await db.attendance.deleteMany();
  await db.parentStudent.deleteMany();
  await db.teacherClass.deleteMany();
  await db.teacherSubject.deleteMany();
  await db.studentProfile.deleteMany();
  await db.teacherProfile.deleteMany();
  await db.parentProfile.deleteMany();
  await db.user.deleteMany();
  await db.class.deleteMany();
  await db.academicYear.deleteMany();
  await db.subject.deleteMany();
  await db.school.deleteMany();

  const passwordHash = await hash();

  const school = await db.school.create({
    data: {
      name: "Greenwood International School",
      address: "42 Knowledge Park, Bengaluru, Karnataka 560001",
      email: "info@greenwood.edu.in",
      phone: "+91 80 1234 5678",
    },
  });

  const academicYear = await db.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2025-2026",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-04-30"),
      isCurrent: true,
    },
  });

  const subjects = await Promise.all(
    ["Mathematics", "Science", "English", "Social Studies", "Hindi", "Computer Science"].map(
      (name, i) =>
        db.subject.create({
          data: { schoolId: school.id, name, code: name.slice(0, 3).toUpperCase() + (i + 1) },
        })
    )
  );

  const classes = await Promise.all(
    [
      { grade: 6, section: "A", name: "Grade 6-A" },
      { grade: 7, section: "A", name: "Grade 7-A" },
      { grade: 8, section: "A", name: "Grade 8-A" },
      { grade: 9, section: "A", name: "Grade 9-A" },
    ].map((c) =>
      db.class.create({
        data: { ...c, academicYearId: academicYear.id },
      })
    )
  );

  const admin = await db.user.create({
    data: {
      name: "Admin User",
      email: "admin@scholaros.demo",
      hashedPassword: passwordHash,
      role: Role.ADMIN,
    },
  });

  const teacherUsers = await Promise.all(
    subjects.slice(0, 6).map((subject, i) =>
      db.user.create({
        data: {
          name: `Teacher ${subject.name}`,
          email: `teacher${i + 1}@scholaros.demo`,
          hashedPassword: passwordHash,
          role: Role.TEACHER,
          teacherProfile: { create: {} },
        },
        include: { teacherProfile: true },
      })
    )
  );

  for (let i = 0; i < teacherUsers.length; i++) {
    const teacher = teacherUsers[i]!;
    await db.teacherSubject.create({
      data: { teacherId: teacher.teacherProfile!.id, subjectId: subjects[i]!.id },
    });
    await db.teacherClass.create({
      data: { teacherId: teacher.teacherProfile!.id, classId: classes[i % classes.length]!.id },
    });
  }

  const parentUsers = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      db.user.create({
        data: {
          name: `Parent ${i + 1}`,
          email: `parent${i + 1}@scholaros.demo`,
          hashedPassword: passwordHash,
          role: Role.PARENT,
          parentProfile: { create: { phone: `+91 98${String(i).padStart(8, "0")}` } },
        },
        include: { parentProfile: true },
      })
    )
  );

  const students: {
    userId: string;
    name: string;
    profile: { id: string; classId: string };
  }[] = [];

  for (let i = 0; i < 30; i++) {
    const classIdx = i % classes.length;
    const cls = classes[classIdx]!;
    const studentName = `${FIRST_NAMES[i]} Kumar`;
    const user = await db.user.create({
      data: {
        name: studentName,
        email: `student${i + 1}@scholaros.demo`,
        hashedPassword: passwordHash,
        role: Role.STUDENT,
        studentProfile: {
          create: {
            classId: cls.id,
            rollNo: String(i + 1).padStart(2, "0"),
            admissionDate: new Date("2024-06-01"),
          },
        },
      },
      include: { studentProfile: true },
    });
    students.push({ userId: user.id, name: studentName, profile: user.studentProfile! });

    const parent = parentUsers[i % parentUsers.length]!;
    await db.parentStudent.create({
      data: {
        parentId: parent.parentProfile!.id,
        studentId: user.studentProfile!.id,
        relation: i % 3 === 0 ? "Mother" : "Father",
      },
    });
  }

  const teacher1 = teacherUsers[0]!;

  for (const cls of classes) {
    for (let h = 0; h < 3; h++) {
      const subject = subjects[h % subjects.length]!;
      const homework = await db.homework.create({
        data: {
          classId: cls.id,
          subjectId: subject.id,
          title: `${subject.name} Assignment ${h + 1}`,
          description: `Complete exercises ${h * 5 + 1} to ${h * 5 + 5}. Show all working.`,
          dueDate: addDays(new Date(), 7 + h),
          createdBy: teacher1.id,
          attachments: [],
        },
      });

      const classStudents = students.filter((s) => s.profile.classId === cls.id);
      for (const st of classStudents) {
        const submitted = Math.random() > 0.3;
        await db.homeworkSubmission.create({
          data: {
            homeworkId: homework.id,
            studentId: st.profile.id,
            content: submitted ? "Completed all exercises with detailed solutions." : null,
            submittedAt: submitted ? subDays(new Date(), Math.floor(Math.random() * 3)) : null,
            status: submitted
              ? Math.random() > 0.5
                ? HomeworkSubmissionStatus.GRADED
                : HomeworkSubmissionStatus.SUBMITTED
              : HomeworkSubmissionStatus.PENDING,
            grade: submitted && Math.random() > 0.5 ? 60 + Math.floor(Math.random() * 40) : null,
            aiFeedback: submitted
              ? {
                  strengths: ["Clear methodology", "Neat presentation"],
                  improvements: ["Show more intermediate steps"],
                  conceptualGaps: ["Review fraction operations"],
                  suggestedGrade: 78,
                  summary: "Good effort overall.",
                }
              : undefined,
          },
        });
      }
    }
  }

  for (let d = 0; d < 30; d++) {
    const date = subDays(new Date(), d);
    for (const st of students) {
      const rand = Math.random();
      const status =
        rand > 0.92
          ? AttendanceStatus.ABSENT
          : rand > 0.85
            ? AttendanceStatus.LATE
            : AttendanceStatus.PRESENT;
      await db.attendance.create({
        data: {
          studentId: st.profile.id,
          classId: st.profile.classId,
          date,
          status,
          markedBy: teacher1.id,
        },
      });
    }
  }

  for (const st of students) {
    for (const subject of subjects.slice(0, 4)) {
      for (const term of ["Term 1", "Term 2"]) {
        await db.grade.create({
          data: {
            studentId: st.profile.id,
            subjectId: subject.id,
            term,
            score: 55 + Math.floor(Math.random() * 45),
            maxScore: 100,
            examType: ExamType.UNIT_TEST,
          },
        });
      }
    }
  }

  for (const cls of classes) {
    const feeStructure = await db.feeStructure.create({
      data: {
        classId: cls.id,
        name: `Annual Fee ${cls.name}`,
        items: [
          { name: "Tuition", amount: 45000 },
          { name: "Lab Fee", amount: 5000 },
          { name: "Sports", amount: 3000 },
        ],
        totalAmount: 53000,
        dueDate: addDays(new Date(), 30),
      },
    });

    const classStudents = students.filter((s) => s.profile.classId === cls.id);
    for (const st of classStudents) {
      const statusRand = Math.random();
      const status =
        statusRand > 0.6
          ? FeeInvoiceStatus.PAID
          : statusRand > 0.3
            ? FeeInvoiceStatus.PENDING
            : FeeInvoiceStatus.OVERDUE;
      const invoice = await db.feeInvoice.create({
        data: {
          studentId: st.profile.id,
          feeStructureId: feeStructure.id,
          amount: 53000,
          status,
          dueDate: status === FeeInvoiceStatus.OVERDUE ? subDays(new Date(), 10) : addDays(new Date(), 30),
          paidAt: status === FeeInvoiceStatus.PAID ? subDays(new Date(), 5) : null,
          description: `Annual fees for ${cls.name}`,
        },
      });
      if (status === FeeInvoiceStatus.PAID) {
        await db.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: 53000,
            transactionRef: `pay_${invoice.id}`,
            gateway: "razorpay",
            method: "upi",
          },
        });
      }
    }
  }

  for (const st of students.slice(0, 10)) {
    await db.reportCard.create({
      data: {
        studentId: st.profile.id,
        academicYearId: academicYear.id,
        term: "Term 1",
        aiSummary:
          "Shows consistent effort across subjects with notable strength in Mathematics. Encouraged to participate more in class discussions.",
        subjectGrades: subjects.slice(0, 4).map((s) => ({
          subject: s.name,
          score: 70 + Math.floor(Math.random() * 25),
          grade: "B+",
        })),
        teacherRemarks: "A dedicated student with room for growth in collaborative work.",
        status: Math.random() > 0.5 ? ReportCardStatus.PUBLISHED : ReportCardStatus.DRAFT,
        publishedAt: Math.random() > 0.5 ? subDays(new Date(), 3) : null,
      },
    });
  }

  const parent1 = parentUsers[0]!;
  const student1 = students[0]!;
  const thread = await db.messageThread.create({
    data: {
      studentId: student1.profile.id,
      teacherId: teacher1.teacherProfile!.id,
      parentId: parent1.parentProfile!.id,
      subject: `Regarding ${student1.name}`,
    },
  });

  await db.message.createMany({
    data: [
      {
        threadId: thread.id,
        senderId: teacher1.id,
        receiverId: parent1.id,
        body: "Hello! Just wanted to share that your child is doing well in Mathematics.",
        readAt: new Date(),
      },
      {
        threadId: thread.id,
        senderId: parent1.id,
        receiverId: teacher1.id,
        body: "Thank you for the update! We appreciate your support.",
      },
    ],
  });

  await db.notification.createMany({
    data: [
      {
        userId: parent1.id,
        type: NotificationType.GENERAL,
        title: "Welcome to ScholarOS",
        body: "Your parent portal is ready. View attendance, homework, and fees.",
      },
      {
        userId: admin.id,
        type: NotificationType.GENERAL,
        title: "System Ready",
        body: "ScholarOS demo data has been loaded successfully.",
      },
    ],
  });

  await db.broadcast.create({
    data: {
      title: "Annual Sports Day",
      body: "Sports Day is scheduled for next month. Students should register with their class teachers.",
      scope: "school",
      scopeId: school.id,
      createdBy: admin.id,
    },
  });

  console.log("✅ Seed complete!");
  console.log("\nDemo credentials (password: password123):");
  console.log("  Admin:   admin@scholaros.demo");
  console.log("  Teacher: teacher1@scholaros.demo");
  console.log("  Parent:  parent1@scholaros.demo");
  console.log("  Student: student1@scholaros.demo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
