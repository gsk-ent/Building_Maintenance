import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Loader,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  displayName,
  getCurrentUser,
  isManager,
  ROLE_LABELS,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityBadge, RequestStatusBadge } from "@/components/ui/badge";

export const metadata = { title: "Dashboard — Building Maintenance" };

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
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
      <PageHeader
        title={`Welcome, ${displayName(user)}`}
        description={
          user.roles.map((r) => ROLE_LABELS[r]).join(",") ||
          "No role assigned yet"
        }
        actions={
          <ButtonLink href="/maintenance/new">
            + New maintenance request
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Open requests"
          value={open.count ?? 0}
          icon={CircleDot}
          iconClass="bg-amber-100 text-amber-800"
        />
        <StatCard
          label="In progress"
          value={inProgress.count ?? 0}
          icon={Loader}
          iconClass="bg-teal-deep/10 text-teal-deep"
        />
        <StatCard
          label="Completed"
          value={completed.count ?? 0}
          icon={CheckCircle2}
          iconClass="bg-emerald-100 text-emerald-800"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent requests"
            action={
              <ButtonLink href="/maintenance" variant="secondary" size="sm">
                View all
              </ButtonLink>
            }
          />
          <CardContent>
            {recent.data?.length ? (
              <ul className="divide-y divide-slate-200">
                {recent.data.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/maintenance/${r.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-1 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {r.title}
                      </span>
                      <span className="flex items-center gap-2">
                        <RequestStatusBadge status={r.status} />
                        <PriorityBadge priority={r.priority} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Wrench}
                title="No requests visible to you yet"
                description="When a maintenance request is raised on one of your properties, it will show up here."
                action={
                  <ButtonLink href="/maintenance/new">
                    + New maintenance request
                  </ButtonLink>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Assigned to you" />
          <CardContent>
            {myAssigned.data?.length ? (
              <ul className="divide-y divide-slate-200">
                {myAssigned.data.map((r) => (
                  <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/maintenance/${r.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-1 hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {r.title}
                      </span>
                      <RequestStatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="Nothing assigned to you right now"
                description="Requests assigned to you will appear here so you can pick them up."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title="Unread notifications"
            action={
              <ButtonLink href="/notifications" variant="secondary" size="sm">
                View all
              </ButtonLink>
            }
          />
          <CardContent>
            {notifications.data?.length ? (
              <ul className="divide-y divide-slate-200">
                {notifications.data.map((n) => (
                  <li key={n.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={n.link ?? "/notifications"}
                      className="block rounded-lg px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    >
                      {n.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="No unread notifications. New updates about your requests will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader
            title={
              isManager(user) ? "Your properties" : "Properties you belong to"
            }
          />
          <CardContent>
            {properties.data?.length ? (
              <ul className="divide-y divide-slate-200">
                {properties.data.map((p) => (
                  <li key={p.id} className="py-3 text-sm first:pt-0 last:pb-0">
                    {isManager(user) ? (
                      <Link
                        href={`/properties/${p.id}`}
                        className="rounded-lg px-2 py-1 font-medium text-slate-900 hover:bg-slate-50"
                      >
                        {p.name}{" "}
                        <span className="text-xs text-slate-500">
                          · {p.city}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900">
                        {p.name}{" "}
                        <span className="text-xs text-slate-500">
                          · {p.city}
                        </span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Building2}
                title="No properties yet"
                description="Properties you belong to will show up here once a manager adds you."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
