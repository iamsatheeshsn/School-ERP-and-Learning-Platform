"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createBook, issueBook, returnBook } from "@/actions/library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
};

type Issue = {
  id: string;
  dueAt: string | Date;
  status: string;
  book: { title: string };
  student: { user: { name: string }; class: { name: string } };
};

type LibraryManagerProps = {
  schoolId: string;
  books: Book[];
  students: { id: string; name: string; className: string }[];
  activeIssues: Issue[];
};

export function LibraryManager({
  schoolId,
  books,
  students,
  activeIssues,
}: LibraryManagerProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [copies, setCopies] = useState("3");
  const [issueBookId, setIssueBookId] = useState(books[0]?.id ?? "");
  const [issueStudentId, setIssueStudentId] = useState(students[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createBook({
        schoolId,
        title,
        author,
        isbn: isbn || undefined,
        totalCopies: parseInt(copies, 10),
      });
      if (result.success) {
        toast.success("Book added");
        setTitle("");
        setAuthor("");
        setIsbn("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleIssue() {
    startTransition(async () => {
      const result = await issueBook({ bookId: issueBookId, studentId: issueStudentId });
      if (result.success) toast.success("Book issued");
      else toast.error(result.error);
    });
  }

  function handleReturn(issueId: string) {
    startTransition(async () => {
      const result = await returnBook(issueId);
      if (result.success) {
        toast.success(
          result.data.fineAmount > 0
            ? `Returned with ₹${result.data.fineAmount} fine`
            : "Book returned"
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Add book</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateBook} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input id="author" value={author} onChange={(e) => setAuthor(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="copies">Copies</Label>
                <Input id="copies" type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={isPending}>Add to catalog</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Issue book</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Book</Label>
            <Select value={issueBookId} onValueChange={(v) => v && setIssueBookId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {books.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title} ({b.availableCopies} available)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={issueStudentId} onValueChange={(v) => v && setIssueStudentId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleIssue} disabled={isPending || !issueBookId}>Issue</Button>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Active loans</CardTitle>
        </CardHeader>
        <CardContent>
          {activeIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">No books currently issued.</p>
          ) : (
            <div className="rounded-xl border border-border/80 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>{issue.book.title}</TableCell>
                      <TableCell>
                        {issue.student.user.name}
                        <span className="block text-xs text-muted-foreground">
                          {issue.student.class.name}
                        </span>
                      </TableCell>
                      <TableCell>{format(new Date(issue.dueAt), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={issue.status === "OVERDUE" ? "destructive" : "secondary"}>
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleReturn(issue.id)} disabled={isPending}>
                          Return
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
