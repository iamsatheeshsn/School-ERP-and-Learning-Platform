"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendBroadcast } from "@/actions/messages";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BroadcastFormProps = {
  classes: { id: string; name: string }[];
};

export function BroadcastForm({ classes }: BroadcastFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"school" | "class">("school");
  const [scopeId, setScopeId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendBroadcast({
        title,
        body,
        scope,
        scopeId: scope === "class" ? scopeId : undefined,
      });
      if (result.success) {
        toast.success(`Broadcast sent to ${result.data.recipients} recipients`);
        setTitle("");
        setBody("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Send Broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="School announcement"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement..."
              rows={5}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select
                value={scope}
                onValueChange={(v) => setScope(v as "school" | "class")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">Entire school</SelectItem>
                  <SelectItem value="class">Specific class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "class" && (
              <div className="space-y-2">
                <Label>Class</Label>
                <Select
                  value={scopeId}
                  onValueChange={(v) => v && setScopeId(v)}
                >
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
            )}
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Sending..." : "Send broadcast"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
