import { Role } from "@prisma/client";
import { PageHeader } from "@/components/shared/page-header";
import { AcademicYearsPanel } from "@/components/dashboard/admin/settings/academic-years-panel";
import { IntegrationsStatus } from "@/components/dashboard/admin/settings/integrations-status";
import { NotificationPreferencesForm } from "@/components/dashboard/admin/settings/notification-preferences-form";
import { SchoolProfileForm } from "@/components/dashboard/admin/settings/school-profile-form";
import { db } from "@/lib/db";
import { parseNotificationSettings } from "@/lib/school/settings";
import { requireRole } from "@/lib/rbac/guards";

export default async function AdminSettingsPage() {
  await requireRole(Role.ADMIN);

  const school = await db.school.findFirst({
    include: {
      academicYears: {
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      },
    },
  });

  if (!school) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          description="School configuration and system preferences."
        />
        <p className="text-sm text-muted-foreground">
          No school record found. Run the database seed to initialize ScholarOS.
        </p>
      </div>
    );
  }

  const notificationSettings = parseNotificationSettings(school.settings);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage school profile, academic years, notifications, and integration status."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <SchoolProfileForm school={school} />
        <NotificationPreferencesForm
          schoolId={school.id}
          settings={notificationSettings}
        />
      </div>

      <AcademicYearsPanel
        schoolId={school.id}
        academicYears={school.academicYears.map((year) => ({
          id: year.id,
          name: year.name,
          startDate: year.startDate.toISOString(),
          endDate: year.endDate.toISOString(),
          isCurrent: year.isCurrent,
        }))}
      />

      <IntegrationsStatus />
    </div>
  );
}
