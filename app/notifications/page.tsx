import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listNotifications } from "@/lib/notification-service";
import { NotificationList } from "@/components/notifications/notification-list";
import { PageIntro } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=/notifications");
  if (!user.profileComplete) redirect("/profile/setup");
  const notifications = await listNotifications(user.id);
  return (
    <main className="page-shell content-narrow">
      <PageIntro eyebrow="Student workspace" title="Notifications">Reservation reminders and empty-seat attendance checks appear here.</PageIntro>
      <section className="panel panel-pad"><NotificationList initialNotifications={notifications} /></section>
    </main>
  );
}
