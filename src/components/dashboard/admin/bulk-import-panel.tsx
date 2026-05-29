"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { bulkImportParents, bulkImportStudents } from "@/actions/bulk-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const STUDENT_TEMPLATE = `name,email,class,rollno
Aarav Kumar,aarav@school.edu,Grade 6-A,31`;

const PARENT_TEMPLATE = `name,email,phone,studentemail,relation
Raj Kumar,raj@email.com,+91 9876543210,student1@scholaros.demo,Father`;

export function BulkImportPanel() {
  const [studentCsv, setStudentCsv] = useState(STUDENT_TEMPLATE);
  const [parentCsv, setParentCsv] = useState(PARENT_TEMPLATE);
  const [defaultPassword, setDefaultPassword] = useState("password123");
  const [studentResult, setStudentResult] = useState<string | null>(null);
  const [parentResult, setParentResult] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function importStudents() {
    startTransition(async () => {
      const result = await bulkImportStudents({ csv: studentCsv, defaultPassword });
      if (result.success) {
        const msg = `Imported ${result.data.created} students. ${result.data.errors.length} errors.`;
        setStudentResult(msg);
        if (result.data.errors.length) {
          toast.error(result.data.errors.slice(0, 3).join(" · "));
        } else {
          toast.success(msg);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  function importParents() {
    startTransition(async () => {
      const result = await bulkImportParents({ csv: parentCsv, defaultPassword });
      if (result.success) {
        const msg = `Imported ${result.data.created} parents, ${result.data.linked} links. ${result.data.errors.length} errors.`;
        setParentResult(msg);
        if (result.data.errors.length) {
          toast.error(result.data.errors.slice(0, 3).join(" · "));
        } else {
          toast.success(msg);
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Bulk CSV import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="default-password">Default password for new accounts</Label>
          <Input
            id="default-password"
            value={defaultPassword}
            onChange={(e) => setDefaultPassword(e.target.value)}
            minLength={6}
          />
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="parents">Parents</TabsTrigger>
          </TabsList>
          <TabsContent value="students" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Columns: <code>name, email, class, rollno</code> — class must match an existing class name.
            </p>
            <Textarea value={studentCsv} onChange={(e) => setStudentCsv(e.target.value)} rows={8} className="font-mono text-xs" />
            <Button type="button" onClick={importStudents} disabled={isPending}>
              {isPending ? "Importing..." : "Import students"}
            </Button>
            {studentResult && <p className="text-sm text-muted-foreground">{studentResult}</p>}
          </TabsContent>
          <TabsContent value="parents" className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              Columns: <code>name, email, phone, studentemail, relation</code>
            </p>
            <Textarea value={parentCsv} onChange={(e) => setParentCsv(e.target.value)} rows={8} className="font-mono text-xs" />
            <Button type="button" onClick={importParents} disabled={isPending}>
              {isPending ? "Importing..." : "Import parents"}
            </Button>
            {parentResult && <p className="text-sm text-muted-foreground">{parentResult}</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
