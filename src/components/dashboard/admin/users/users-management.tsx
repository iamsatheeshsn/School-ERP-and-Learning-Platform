"use client";

import { useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerUser } from "@/actions/auth";
import {
  createClass,
  createSubject,
  linkParentToStudent,
  unlinkParentFromStudent,
} from "@/actions/users";
import { StudentsTable, type StudentRow } from "@/components/dashboard/admin/students-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ClassOption = { id: string; name: string; grade: number; section: string };
type AcademicYearOption = { id: string; name: string; isCurrent: boolean };
type ParentOption = { id: string; name: string; email: string };
type StudentOption = { id: string; name: string; className: string; rollNo: string };
type ParentLinkRow = {
  id: string;
  relation: string;
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
};
type TeacherRow = { id: string; name: string; email: string };
type ParentRow = { id: string; name: string; email: string; phone: string | null };
type SubjectRow = { id: string; name: string; code: string };
type ClassRow = {
  id: string;
  name: string;
  grade: number;
  section: string;
  academicYear: string;
  studentCount: number;
};

export type UsersManagementProps = {
  defaultTab: string;
  schoolId: string;
  classes: ClassOption[];
  academicYears: AcademicYearOption[];
  students: StudentRow[];
  studentOptions: StudentOption[];
  parents: ParentOption[];
  parentRows: ParentRow[];
  teacherRows: TeacherRow[];
  subjectRows: SubjectRow[];
  classRows: ClassRow[];
  parentLinks: ParentLinkRow[];
};

const TAB_VALUES = [
  "students",
  "teachers",
  "parents",
  "classes",
  "links",
] as const;

function isValidTab(tab: string): tab is (typeof TAB_VALUES)[number] {
  return TAB_VALUES.includes(tab as (typeof TAB_VALUES)[number]);
}

export function UsersManagement({
  defaultTab,
  schoolId,
  classes,
  academicYears,
  students,
  studentOptions,
  parents,
  parentRows,
  teacherRows,
  subjectRows,
  classRows,
  parentLinks,
}: UsersManagementProps) {
  const router = useRouter();
  const initialTab = isValidTab(defaultTab) ? defaultTab : "students";
  const [tab, setTab] = useState<string>(initialTab);

  function onTabChange(value: string) {
    setTab(value);
    router.replace(`/admin/users?tab=${value}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="students">Students</TabsTrigger>
        <TabsTrigger value="teachers">Teachers</TabsTrigger>
        <TabsTrigger value="parents">Parents</TabsTrigger>
        <TabsTrigger value="classes">Classes & Subjects</TabsTrigger>
        <TabsTrigger value="links">Parent Links</TabsTrigger>
      </TabsList>

      <TabsContent value="students" className="space-y-6">
        <RegisterStudentForm classes={classes} />
        {students.length > 0 ? (
          <StudentsTable data={students} />
        ) : (
          <EmptyDirectory message="No students enrolled yet." />
        )}
      </TabsContent>

      <TabsContent value="teachers" className="space-y-6">
        <RegisterTeacherForm />
        <DirectoryCard
          title="Teachers"
          emptyMessage="No teachers registered yet."
          rows={teacherRows.map((teacher) => ({
            id: teacher.id,
            primary: teacher.name,
            secondary: teacher.email,
          }))}
        />
      </TabsContent>

      <TabsContent value="parents" className="space-y-6">
        <RegisterParentForm />
        <DirectoryCard
          title="Parents"
          emptyMessage="No parents registered yet."
          rows={parentRows.map((parent) => ({
            id: parent.id,
            primary: parent.name,
            secondary: parent.phone
              ? `${parent.email} · ${parent.phone}`
              : parent.email,
          }))}
        />
      </TabsContent>

      <TabsContent value="classes" className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <CreateClassForm
            academicYears={academicYears}
            defaultYearId={
              academicYears.find((year) => year.isCurrent)?.id ?? academicYears[0]?.id ?? ""
            }
          />
          <CreateSubjectForm schoolId={schoolId} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <DirectoryCard
            title="Classes"
            emptyMessage="No classes configured yet."
            rows={classRows.map((cls) => ({
              id: cls.id,
              primary: cls.name,
              secondary: `${cls.academicYear} · ${cls.studentCount} students`,
              badge: `Grade ${cls.grade}-${cls.section}`,
            }))}
          />
          <DirectoryCard
            title="Subjects"
            emptyMessage="No subjects configured yet."
            rows={subjectRows.map((subject) => ({
              id: subject.id,
              primary: subject.name,
              secondary: subject.code,
              badge: subject.code,
            }))}
          />
        </div>
      </TabsContent>

      <TabsContent value="links" className="space-y-6">
        <LinkParentForm
          parents={parents}
          students={studentOptions}
          defaultParentId={parents[0]?.id ?? ""}
          defaultStudentId={studentOptions[0]?.id ?? ""}
        />
        <ParentLinksList links={parentLinks} />
      </TabsContent>
    </Tabs>
  );
}

function EmptyDirectory({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardContent className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

function DirectoryCard({
  title,
  emptyMessage,
  rows,
}: {
  title: string;
  emptyMessage: string;
  rows: { id: string; primary: string; secondary: string; badge?: string }[];
}) {
  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/50 p-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium">{row.primary}</p>
                  <p className="truncate text-sm text-muted-foreground">{row.secondary}</p>
                </div>
                {row.badge && <Badge variant="secondary">{row.badge}</Badge>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RegisterStudentForm({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [rollNo, setRollNo] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerUser({
        name,
        email,
        password,
        role: Role.STUDENT,
        classId,
        rollNo,
      });
      if (result.success) {
        toast.success("Student registered");
        setName("");
        setEmail("");
        setRollNo("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Add student</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="student-name">
            <Input
              id="student-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Kumar"
              required
            />
          </Field>
          <Field label="Email" id="student-email">
            <Input
              id="student-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@school.edu"
              required
            />
          </Field>
          <Field label="Password" id="student-password">
            <Input
              id="student-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          <Field label="Class" id="student-class">
            <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
              <SelectTrigger id="student-class">
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Roll number" id="student-roll">
            <Input
              id="student-roll"
              value={rollNo}
              onChange={(e) => setRollNo(e.target.value)}
              placeholder="01"
              required
            />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={isPending || classes.length === 0}>
              {isPending ? "Registering..." : "Register student"}
            </Button>
          </div>
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Create a class first under the Classes &amp; Subjects tab.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterTeacherForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerUser({
        name,
        email,
        password,
        role: Role.TEACHER,
      });
      if (result.success) {
        toast.success("Teacher registered");
        setName("");
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Add teacher</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="teacher-name">
            <Input
              id="teacher-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Sharma"
              required
            />
          </Field>
          <Field label="Email" id="teacher-email">
            <Input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@school.edu"
              required
            />
          </Field>
          <Field label="Password" id="teacher-password">
            <Input
              id="teacher-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Registering..." : "Register teacher"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function RegisterParentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [phone, setPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await registerUser({
        name,
        email,
        password,
        role: Role.PARENT,
        phone,
      });
      if (result.success) {
        toast.success("Parent registered");
        setName("");
        setEmail("");
        setPhone("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Add parent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" id="parent-name">
            <Input
              id="parent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Raj Kumar"
              required
            />
          </Field>
          <Field label="Email" id="parent-email">
            <Input
              id="parent-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
              required
            />
          </Field>
          <Field label="Password" id="parent-password">
            <Input
              id="parent-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </Field>
          <Field label="Phone (optional)" id="parent-phone">
            <Input
              id="parent-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </Field>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Registering..." : "Register parent"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateClassForm({
  academicYears,
  defaultYearId,
}: {
  academicYears: AcademicYearOption[];
  defaultYearId: string;
}) {
  const router = useRouter();
  const [academicYearId, setAcademicYearId] = useState(defaultYearId);
  const [grade, setGrade] = useState("6");
  const [section, setSection] = useState("A");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createClass({
        academicYearId,
        grade: Number(grade),
        section,
        name: name || undefined,
      });
      if (result.success) {
        toast.success(`Class "${result.data.name}" created`);
        setName("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Create class</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Academic year" id="class-year">
            <Select value={academicYearId} onValueChange={(v) => v && setAcademicYearId(v)}>
              <SelectTrigger id="class-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year.id} value={year.id}>
                    {year.name}
                    {year.isCurrent ? " (current)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Grade" id="class-grade">
              <Input
                id="class-grade"
                type="number"
                min={1}
                max={12}
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
              />
            </Field>
            <Field label="Section" id="class-section">
              <Input
                id="class-section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                maxLength={10}
                required
              />
            </Field>
          </div>
          <Field label="Display name (optional)" id="class-name">
            <Input
              id="class-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grade 6-A"
            />
          </Field>
          <Button type="submit" disabled={isPending || academicYears.length === 0}>
            {isPending ? "Creating..." : "Create class"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateSubjectForm({ schoolId }: { schoolId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createSubject({ schoolId, name, code });
      if (result.success) {
        toast.success("Subject created");
        setName("");
        setCode("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Create subject</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Subject name" id="subject-name">
            <Input
              id="subject-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mathematics"
              required
            />
          </Field>
          <Field label="Subject code" id="subject-code">
            <Input
              id="subject-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MAT1"
              maxLength={12}
              required
            />
          </Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create subject"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LinkParentForm({
  parents,
  students,
  defaultParentId,
  defaultStudentId,
}: {
  parents: ParentOption[];
  students: StudentOption[];
  defaultParentId: string;
  defaultStudentId: string;
}) {
  const router = useRouter();
  const [parentId, setParentId] = useState(defaultParentId);
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [relation, setRelation] = useState("Father");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await linkParentToStudent({ parentId, studentId, relation });
      if (result.success) {
        toast.success("Parent linked to student");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  const canSubmit = parents.length > 0 && students.length > 0;

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Link parent to student</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Parent" id="link-parent">
            <Select value={parentId} onValueChange={(v) => v && setParentId(v)}>
              <SelectTrigger id="link-parent">
                <SelectValue placeholder="Select parent" />
              </SelectTrigger>
              <SelectContent>
                {parents.map((parent) => (
                  <SelectItem key={parent.id} value={parent.id}>
                    {parent.name} ({parent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Student" id="link-student">
            <Select value={studentId} onValueChange={(v) => v && setStudentId(v)}>
              <SelectTrigger id="link-student">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name} · {student.className} · Roll {student.rollNo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Relation" id="link-relation">
            <Select value={relation} onValueChange={(v) => v && setRelation(v)}>
              <SelectTrigger id="link-relation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Father">Father</SelectItem>
                <SelectItem value="Mother">Mother</SelectItem>
                <SelectItem value="Guardian">Guardian</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending || !canSubmit}>
              {isPending ? "Linking..." : "Link parent"}
            </Button>
          </div>
          {!canSubmit && (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Register at least one parent and one student before creating links.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function ParentLinksList({ links }: { links: ParentLinkRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove(linkId: string) {
    startTransition(async () => {
      const result = await unlinkParentFromStudent({ linkId });
      if (result.success) {
        toast.success("Link removed");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Existing parent links</CardTitle>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parent-student links yet.</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {link.parentName}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({link.relation})
                    </span>{" "}
                    → {link.studentName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {link.parentEmail} · {link.className}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRemove(link.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
