"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createFeeStructure,
  generateInvoices,
  sendOverdueFeeReminders,
} from "@/actions/fees";
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
import { EmptyState } from "@/components/shared/empty-state";
import { Wallet } from "lucide-react";

type FeesManagerProps = {
  classes: { id: string; name: string }[];
  feeStructures: {
    id: string;
    name: string;
    totalAmount: number;
    class: { name: string };
  }[];
};

export function FeesManager({ classes, feeStructures }: FeesManagerProps) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [structureId, setStructureId] = useState(feeStructures[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handleCreateStructure(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createFeeStructure({
        classId,
        name,
        items: [{ name: "Tuition", amount: parseFloat(amount) }],
        dueDate: new Date(dueDate).toISOString(),
      });
      if (result.success) {
        toast.success("Fee structure created");
        setName("");
        setAmount("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleGenerateInvoices() {
    if (!structureId) return;
    startTransition(async () => {
      const result = await generateInvoices({ feeStructureId: structureId });
      if (result.success) {
        toast.success(`Generated ${result.data.created} invoices`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSendReminders() {
    startTransition(async () => {
      const result = await sendOverdueFeeReminders();
      if (result.success) {
        const { synced, reminded, skipped } = result.data;
        toast.success(
          synced > 0
            ? `Marked ${synced} overdue · sent ${reminded} reminder${reminded === 1 ? "" : "s"} (${skipped} skipped)`
            : reminded > 0
              ? `Sent ${reminded} reminder${reminded === 1 ? "" : "s"} (${skipped} skipped)`
              : `No reminders sent (${skipped} skipped — already reminded recently)`
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Create Fee Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add classes before creating fee structures.
            </p>
          ) : (
          <form onSubmit={handleCreateStructure} className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={(v) => v && setClassId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-name">Name</Label>
              <Input
                id="fee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Term 1 Fees"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount (₹)</Label>
              <Input
                id="fee-amount"
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-due">Due date</Label>
              <Input
                id="fee-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              Create structure
            </Button>
          </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Generate Invoices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {feeStructures.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No fee structures"
              description="Create a fee structure first, then generate invoices for a class."
              className="py-10"
            />
          ) : (
          <>
          <div className="space-y-2">
            <Label>Fee structure</Label>
            <Select value={structureId} onValueChange={(v) => v && setStructureId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select structure" />
              </SelectTrigger>
              <SelectContent>
                {feeStructures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.class.name} (₹{s.totalAmount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerateInvoices}
            disabled={isPending || !structureId}
          >
            Generate invoices for class
          </Button>
          </>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Overdue reminders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Marks past-due invoices as overdue and emails parents (respects notification
            settings). Reminders are limited to once every 7 days per invoice.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleSendReminders}
            disabled={isPending}
          >
            Send overdue reminders
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
