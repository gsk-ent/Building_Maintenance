import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager, ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Dashboard — Building Maintenance" };

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="bg-white p-3 text-center">
      <p className="label-mono text-[10px]">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const supabase = await createClient();

  // RLS automatically scopes every one of these queries to what this
  // user is allowed to see.
  const [
    open,
    inProgress,
    completed,
    recent,
    myAssigned,
    notifications,
    properties,
  ] = await Promise.all([
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
          <h1 className="text-xl font-bold text-teal-deep">
            Welcome, {user.profile?.full_name || user.email}
          </h1>
          <p className="text-sm text-muted">
            {user.roles.map((r) => ROLE_LABELS[r]).join(",") ||
              "No role assigned yet"}
          </p>
        </div>
        <Link
          href="/maintenance/new"
          className="label-mono border border-teal-deep bg-teal-deep px-4 py-2.5 text-[11px] text-white hover:bg-teal"
        >
          + New maintenance request
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
        <StatCard
          label="Open requests"
          value={open.count ?? 0}
          tone="text-gold"
        />
        <StatCard
          label="In progress"
          value={inProgress.count ?? 0}
          tone="text-teal-deep"
        />
        <StatCard
          label="Completed"
          value={completed.count ?? 0}
          tone="text-good"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Recent requests
          </h2>
          {recent.data?.length ? (
            <ul className="divide-y divide-line">
              {recent.data.map((r) => (
                <li key={r.id} className="py-2">
                  <Link
                    href={`/maintenance/${r.id}`}
                    className="block hover:underline"
                  >
                    <span className="text-sm font-medium text-ink">
                      {r.title}
                    </span>
                    <span className="ml-2 text-xs text-muted">
                      {r.status} · {r.priority}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No requests visible to you yet.
            </p>
          )}
        </section>

        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Assigned to you
          </h2>
          {myAssigned.data?.length ? (
            <ul className="divide-y divide-line">
              {myAssigned.data.map((r) => (
                <li key={r.id} className="py-2">
                  <Link
                    href={`/maintenance/${r.id}`}
                    className="block hover:underline"
                  >
                    <span className="text-sm font-medium text-ink">
                      {r.title}
                    </span>
                    <span className="ml-2 text-xs text-muted">{r.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              Nothing assigned to you right now.
            </p>
          )}
        </section>

        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Unread notifications
          </h2>
          {notifications.data?.length ? (
            <ul className="divide-y divide-line">
              {notifications.data.map((n) => (
                <li key={n.id} className="py-2 text-sm text-ink">
                  <Link
                    href={n.link ?? "/notifications"}
                    className="hover:underline"
                  >
                    {n.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">You&apos;re all caught up.</p>
          )}
        </section>

        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            {isManager(user) ? "Your properties" : "Properties you belong to"}
          </h2>
          {properties.data?.length ? (
            <ul className="divide-y divide-line">
              {properties.data.map((p) => (
                <li key={p.id} className="py-2 text-sm">
                  {isManager(user) ? (
                    <Link
                      href={`/properties/${p.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {p.name}{" "}
                      <span className="text-xs text-muted">· {p.city}</span>
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">
                      {p.name}{" "}
                      <span className="text-xs text-muted">· {p.city}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No properties yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
