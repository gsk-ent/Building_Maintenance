import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager, ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Dashboard — Building Maintenance" };

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // RLS automatically scopes every one of these queries to what this
  // user is allowed to see.
  const [open, inProgress, completed, recent, myAssigned, notifications, properties] =
    await Promise.all([
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "triaged"]),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["in_progress", "on_hold"]),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["completed", "closed"]),
      supabase
        .from("maintenance_requests")
        .select("id, title, status, priority, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("maintenance_requests")
        .select("id, title, status, priority")
        .eq("assigned_to", user.id)
        .not("status", "in", '("completed","closed","cancelled")')
        .limit(5),
      supabase
        .from("notifications")
        .select("id, title, link, created_at")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("properties").select("id, name, city").limit(5),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Welcome, {user.profile?.full_name || user.email}
          </h1>
          <p className="text-sm text-slate-500">
            {user.roles.map((r) => ROLE_LABELS[r]).join(", ") || "No role assigned yet"}
          </p>
        </div>
        <Link
          href="/maintenance/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          + New maintenance request
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Open requests" value={open.count ?? 0} tone="text-amber-600" />
        <StatCard label="In progress" value={inProgress.count ?? 0} tone="text-blue-600" />
        <StatCard label="Completed" value={completed.count ?? 0} tone="text-green-600" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent requests</h2>
          {recent.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {recent.data.map((r) => (
                <li key={r.id} className="py-2">
                  <Link href={`/maintenance/${r.id}`} className="block hover:underline">
                    <span className="text-sm font-medium text-slate-800">{r.title}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {r.status} · {r.priority}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No requests visible to you yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Assigned to you</h2>
          {myAssigned.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {myAssigned.data.map((r) => (
                <li key={r.id} className="py-2">
                  <Link href={`/maintenance/${r.id}`} className="block hover:underline">
                    <span className="text-sm font-medium text-slate-800">{r.title}</span>
                    <span className="ml-2 text-xs text-slate-500">{r.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nothing assigned to you right now.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Unread notifications</h2>
          {notifications.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {notifications.data.map((n) => (
                <li key={n.id} className="py-2 text-sm text-slate-700">
                  <Link href={n.link ?? "/notifications"} className="hover:underline">
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">You&apos;re all caught up.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            {isManager(user) ? "Your properties" : "Properties you belong to"}
          </h2>
          {properties.data?.length ? (
            <ul className="divide-y divide-slate-100">
              {properties.data.map((p) => (
                <li key={p.id} className="py-2 text-sm">
                  {isManager(user) ? (
                    <Link href={`/properties/${p.id}`} className="font-medium text-slate-800 hover:underline">
                      {p.name} <span className="text-xs text-slate-500">· {p.city}</span>
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-800">
                      {p.name} <span className="text-xs text-slate-500">· {p.city}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No properties yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
