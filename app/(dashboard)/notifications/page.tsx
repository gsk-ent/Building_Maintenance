import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>
      {notifications?.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${!n.read_at ? "bg-blue-50/50" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-slate-800">
                  {n.link ? (
                    <Link href={n.link} className="hover:underline">
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
                <p className="text-xs text-slate-400">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_at && (
                <form action={markNotificationRead}>
                  <input type="hidden" name="notificationId" value={n.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Mark read
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No notifications yet.
        </div>
      )}
    </div>
  );
}
