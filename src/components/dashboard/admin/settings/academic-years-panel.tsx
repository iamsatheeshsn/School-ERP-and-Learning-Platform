"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { createAcademicYear, setCurrentAcademicYear } from "@/actions/settings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AcademicYearRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

type AcademicYearsPanelProps = {
  schoolId: string;
  academicYears: AcademicYearRow[];
};

export function AcademicYearsPanel({
  schoolId,
  academicYears: initialYears,
}: AcademicYearsPanelProps) {
  const [years, setYears] = useState(initialYears);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [setCurrent, setSetCurrent] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createAcademicYear({
        schoolId,
        name,
        startDate,
        endDate,
        setCurrent,
      });
      if (result.success) {
        toast.success("Academic year created");
        setYears((current) => {
          const next = setCurrent
            ? current.map((year) => ({ ...year, isCurrent: false }))
            : current;
          return [
            ...next,
            {
              id: result.data.id,
              name,
              startDate,
              endDate,
              isCurrent: setCurrent,
            },
          ];
        });
        setName("");
        setStartDate("");
        setEndDate("");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSetCurrent(academicYearId: string) {
    startTransition(async () => {
      const result = await setCurrentAcademicYear({ academicYearId });
      if (result.success) {
        toast.success("Current academic year updated");
        setYears((current) =>
          current.map((year) => ({
            ...year,
            isCurrent: year.id === academicYearId,
          }))
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Academic years</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {years.length > 0 ? (
          <div className="space-y-3">
            {years.map((year) => (
              <div
                key={year.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{year.name}</span>
                    {year.isCurrent && <Badge>Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(year.startDate), "MMM d, yyyy")} —{" "}
                    {format(new Date(year.endDate), "MMM d, yyyy")}
                  </p>
                </div>
                {!year.isCurrent && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleSetCurrent(year.id)}
                  >
                    Set as current
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No academic years yet. Add the first one below.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4 border-t border-border/60 pt-6">
          <p className="text-sm font-medium">Add academic year</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="year-name">Name</Label>
              <Input
                id="year-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="2026-2027"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-start">Start date</Label>
              <Input
                id="year-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-end">End date</Label>
              <Input
                id="year-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={setCurrent}
                  onCheckedChange={(checked) => setSetCurrent(checked === true)}
                />
                Set as current year
              </label>
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding..." : "Add academic year"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
