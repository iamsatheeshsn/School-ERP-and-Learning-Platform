"use client";

import { useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { toast } from "sonner";
import { changePassword, updateProfile } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfilePanelProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    createdAt: Date;
    studentProfile?: { rollNo: string; classId: string } | null;
    parentProfile?: { phone: string | null } | null;
  };
  className?: string | null;
};

export function ProfilePanel({ user, className }: ProfilePanelProps) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isPasswordPending, startPasswordTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    startProfileTransition(async () => {
      const result = await updateProfile({ name });
      if (result.success) toast.success("Profile updated");
      else toast.error(result.error);
    });
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    startPasswordTransition(async () => {
      const result = await changePassword({ currentPassword, newPassword });
      if (result.success) {
        toast.success("Password changed");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{user.role}</Badge>
            <span className="text-sm text-muted-foreground">
              Member since {format(new Date(user.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            {className && (
              <div>
                <dt className="text-muted-foreground">Class</dt>
                <dd className="font-medium">{className}</dd>
              </div>
            )}
            {user.studentProfile && (
              <div>
                <dt className="text-muted-foreground">Roll number</dt>
                <dd className="font-medium">{user.studentProfile.rollNo}</dd>
              </div>
            )}
            {user.parentProfile?.phone && (
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{user.parentProfile.phone}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Display name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isProfilePending}>
              {isProfilePending ? "Saving..." : "Save name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card id="password" className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={isPasswordPending}>
                {isPasswordPending ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
