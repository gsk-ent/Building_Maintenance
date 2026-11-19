import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Notifications — Building Maintenance" };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = notifications?.some((n) => !n.read_at);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Updates about your requests, work orders and properties."
        actions={
          hasUnread ? (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className={buttonClasses("secondary", "sm")}
              >
                Mark all read
              </button>
            </form>
          ) : undefined
        }
      />
      {notifications?.length ? (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 ${!n.read_at ? "bg-amber-50" : ""}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                {n.body && (
                  <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                )}
                <p className="mt-0.5 text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_at && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={n.id} />
                  <button
                    type="submit"
                    className={buttonClasses("secondary", "sm")}
                  >
                    Mark read
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="We'll let you know here when something about your requests needs your attention."
        />
      )}
    </div>
  );
}
