import { getCurrentUser } from "@/actions/auth";
import { ProfilePanel } from "@/components/dashboard/profile/profile-panel";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  const result = await getCurrentUser();
  if (!result.success) {
    return <p className="text-sm text-muted-foreground">Unable to load profile.</p>;
  }

  const user = result.data;
  let className: string | null = null;

  if (user.studentProfile?.classId) {
    const cls = await db.class.findUnique({
      where: { id: user.studentProfile.classId },
      select: { name: true },
    });
    className = cls?.name ?? null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account details and password."
      />
      <ProfilePanel
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          studentProfile: user.studentProfile,
          parentProfile: user.parentProfile,
        }}
        className={className}
      />
    </div>
  );
}
