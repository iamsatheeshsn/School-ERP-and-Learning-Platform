"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateNotificationSettings } from "@/actions/settings";
import type { NotificationSettings } from "@/lib/school/settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationPreferencesFormProps = {
  schoolId: string;
  settings: NotificationSettings;
};

const PREFERENCE_ITEMS: {
  key: keyof NotificationSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "emailEnabled",
    label: "Email notifications",
    description: "Master switch for outbound email alerts",
  },
  {
    key: "attendanceAlerts",
    label: "Attendance alerts",
    description: "Notify parents when students are marked absent or late",
  },
  {
    key: "homeworkReminders",
    label: "Homework reminders",
    description: "Remind students and parents about upcoming homework",
  },
  {
    key: "feeReminders",
    label: "Fee reminders",
    description: "Send reminders for pending or overdue invoices",
  },
  {
    key: "reportCardPublished",
    label: "Report card published",
    description: "Alert families when report cards are published",
  },
  {
    key: "broadcastMessages",
    label: "Broadcast messages",
    description: "Deliver school-wide and class announcements",
  },
];

export function NotificationPreferencesForm({
  schoolId,
  settings,
}: NotificationPreferencesFormProps) {
  const [prefs, setPrefs] = useState(settings);
  const [isPending, startTransition] = useTransition();

  function togglePreference(key: keyof NotificationSettings, checked: boolean) {
    setPrefs((current) => ({ ...current, [key]: checked }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateNotificationSettings({
        schoolId,
        ...prefs,
      });
      if (result.success) {
        toast.success("Notification preferences saved");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Notification preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {PREFERENCE_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-4"
            >
              <Checkbox
                checked={prefs[item.key]}
                onCheckedChange={(checked) =>
                  togglePreference(item.key, checked === true)
                }
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-sm text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </label>
          ))}
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save preferences"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
