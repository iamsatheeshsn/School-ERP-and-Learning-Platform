"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  updateClassRecord,
  updateParent,
  updateParentLink,
  updateStudent,
  updateSubjectRecord,
  updateTeacher,
} from "@/actions/users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassOption = { id: string; name: string };

export type EditTarget =
  | {
      kind: "student";
      studentProfileId: string;
      name: string;
      email: string;
      classId: string;
      rollNo: string;
    }
  | { kind: "teacher"; userId: string; name: string; email: string }
  | {
      kind: "parent";
      parentProfileId: string;
      userId: string;
      name: string;
      email: string;
      phone: string | null;
    }
  | {
      kind: "class";
      classId: string;
      name: string;
      grade: number;
      section: string;
    }
  | { kind: "subject"; subjectId: string; schoolId: string; name: string; code: string }
  | { kind: "link"; linkId: string; relation: string };

type EntityEditDialogProps = {
  target: EditTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassOption[];
  schoolId: string;
  onSaved: () => void;
};

export function EntityEditDialog({
  target,
  open,
  onOpenChange,
  classes,
  schoolId,
  onSaved,
}: EntityEditDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [grade, setGrade] = useState("6");
  const [section, setSection] = useState("A");
  const [code, setCode] = useState("");
  const [relation, setRelation] = useState("Father");

  useEffect(() => {
    if (!target) return;
    if (target.kind === "student") {
      setName(target.name);
      setEmail(target.email);
      setClassId(target.classId);
      setRollNo(target.rollNo);
    } else if (target.kind === "teacher" || target.kind === "parent") {
      setName(target.name);
      setEmail(target.email);
      if (target.kind === "parent") setPhone(target.phone ?? "");
    } else if (target.kind === "class") {
      setName(target.name);
      setGrade(String(target.grade));
      setSection(target.section);
    } else if (target.kind === "subject") {
      setName(target.name);
      setCode(target.code);
    } else if (target.kind === "link") {
      setRelation(target.relation);
    }
  }, [target]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;

    startTransition(async () => {
      let result;
      switch (target.kind) {
        case "student":
          result = await updateStudent({
            studentProfileId: target.studentProfileId,
            name,
            email,
            classId,
            rollNo,
          });
          break;
        case "teacher":
          result = await updateTeacher({ userId: target.userId, name, email });
          break;
        case "parent":
          result = await updateParent({
            parentProfileId: target.parentProfileId,
            userId: target.userId,
            name,
            email,
            phone,
          });
          break;
        case "class":
          result = await updateClassRecord({
            classId: target.classId,
            name,
            grade: Number(grade),
            section,
          });
          break;
        case "subject":
          result = await updateSubjectRecord({
            subjectId: target.subjectId,
            schoolId,
            name,
            code,
          });
          break;
        case "link":
          result = await updateParentLink({ linkId: target.linkId, relation });
          break;
      }

      if (result.success) {
        toast.success("Saved successfully");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(result.error);
      }
    });
  }

  const title =
    target?.kind === "student"
      ? "Edit student"
      : target?.kind === "teacher"
        ? "Edit teacher"
        : target?.kind === "parent"
          ? "Edit parent"
          : target?.kind === "class"
            ? "Edit class"
            : target?.kind === "subject"
              ? "Edit subject"
              : target?.kind === "link"
                ? "Edit parent link"
                : "Edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="p-4 pr-12">
          <DialogHeader className="mb-4">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <form id="entity-edit-form" onSubmit={handleSubmit} className="space-y-4">
          {(target?.kind === "student" ||
            target?.kind === "teacher" ||
            target?.kind === "parent") && (
            <>
              <Field label="Full name" id="edit-name">
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Email" id="edit-email">
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          {target?.kind === "parent" && (
            <Field label="Phone" id="edit-phone">
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          )}

          {target?.kind === "student" && (
            <>
              <Field label="Class" id="edit-class">
                <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
                  <SelectTrigger id="edit-class">
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
              <Field label="Roll number" id="edit-roll">
                <Input
                  id="edit-roll"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  required
                />
              </Field>
            </>
          )}

          {target?.kind === "class" && (
            <>
              <Field label="Display name" id="edit-class-name">
                <Input
                  id="edit-class-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Grade" id="edit-grade">
                  <Input
                    id="edit-grade"
                    type="number"
                    min={1}
                    max={12}
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Section" id="edit-section">
                  <Input
                    id="edit-section"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    required
                  />
                </Field>
              </div>
            </>
          )}

          {target?.kind === "subject" && (
            <>
              <Field label="Subject name" id="edit-subject-name">
                <Input
                  id="edit-subject-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Subject code" id="edit-subject-code">
                <Input
                  id="edit-subject-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                />
              </Field>
            </>
          )}

          {target?.kind === "link" && (
            <Field label="Relation" id="edit-relation">
              <Select value={relation} onValueChange={(v) => v && setRelation(v)}>
                <SelectTrigger id="edit-relation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Father">Father</SelectItem>
                  <SelectItem value="Mother">Mother</SelectItem>
                  <SelectItem value="Guardian">Guardian</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}

          </form>
        </div>
        <DialogFooter className="rounded-none border-t bg-muted/30 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="entity-edit-form" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button type="button" variant="destructive" size="sm" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
