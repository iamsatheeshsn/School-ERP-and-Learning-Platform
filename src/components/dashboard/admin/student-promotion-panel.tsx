"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { promoteStudents } from "@/actions/promotion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StudentPromotionPanelProps = {
  classes: { id: string; name: string }[];
};

export function StudentPromotionPanel({ classes }: StudentPromotionPanelProps) {
  const router = useRouter();
  const [fromClassId, setFromClassId] = useState(classes[0]?.id ?? "");
  const [toClassId, setToClassId] = useState(classes[1]?.id ?? classes[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  function handlePromote() {
    if (!fromClassId || !toClassId) return;
    startTransition(async () => {
      const result = await promoteStudents({ fromClassId, toClassId });
      if (result.success) {
        toast.success(`Promoted ${result.data.promoted} students`);
        if (result.data.errors.length) {
          toast.error(result.data.errors.slice(0, 2).join(" · "));
        }
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Promote students</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Move all students from one class to another (e.g. end-of-year promotion). Roll numbers must not conflict in the target class.
        </p>
        <div className="space-y-2">
          <Label>From class</Label>
          <Select value={fromClassId} onValueChange={(v) => v && setFromClassId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Source class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>To class</Label>
          <Select value={toClassId} onValueChange={(v) => v && setToClassId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Target class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="button" onClick={handlePromote} disabled={isPending || classes.length < 2}>
            {isPending ? "Promoting..." : "Promote all students"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
