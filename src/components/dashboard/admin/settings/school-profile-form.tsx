"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateSchoolProfile } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SchoolProfileFormProps = {
  school: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
};

export function SchoolProfileForm({ school }: SchoolProfileFormProps) {
  const [name, setName] = useState(school.name);
  const [address, setAddress] = useState(school.address ?? "");
  const [phone, setPhone] = useState(school.phone ?? "");
  const [email, setEmail] = useState(school.email ?? "");
  const [logoUrl, setLogoUrl] = useState(school.logoUrl ?? "");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSchoolProfile({
        schoolId: school.id,
        name,
        address,
        phone,
        email,
        logoUrl,
      });
      if (result.success) {
        toast.success("School profile updated");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-white/20 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-heading text-lg">School profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="school-name">School name</Label>
              <Input
                id="school-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Greenwood International School"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="school-address">Address</Label>
              <Textarea
                id="school-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, state, postal code"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone">Phone</Label>
              <Input
                id="school-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 80 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-email">Email</Label>
              <Input
                id="school-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@school.edu"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="school-logo">Logo URL</Label>
              <Input
                id="school-logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
