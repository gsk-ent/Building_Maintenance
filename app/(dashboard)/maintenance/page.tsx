import Link from "next/link";
import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { formatStatus } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriorityBadge, RequestStatusBadge } from "@/components/ui/badge";

export const metadata = { title: "Maintenance — Building Maintenance" };

const STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "on_hold",
  "completed",
  "closed",
  "cancelled",
] as const;

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { status } = await searchParams;

  const supabase = await createClient();
  let query = supabase
    .from("maintenance_requests")
    .select("id, title, status, priority, created_at, property_id")
    .order("created_at", { ascending: false })
    .limit(50);
  if (status && (STATUSES as readonly string[]).includes(status)) {
    query = query.eq(
      "status",
      status as import("@/types/database").RequestStatus
    );
  }
  const { data: requests } = await query;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance requests"
        description="Track and triage every request across your properties."
        actions={<ButtonLink href="/maintenance/new">+ New request</ButtonLink>}
      />

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <ButtonLink
          href="/maintenance"
          variant={!status ? "primary" : "secondary"}
          size="sm"
        >
          All
        </ButtonLink>
        {STATUSES.map((s) => (
          <ButtonLink
            key={s}
            href={`/maintenance?status=${s}`}
            variant={status === s ? "primary" : "secondary"}
            size="sm"
          >
            {formatStatus(s)}
          </ButtonLink>
        ))}
      </nav>

      {requests?.length ? (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/maintenance/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-900">
                  {r.title}
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <RequestStatusBadge status={r.status} />
                  <PriorityBadge priority={r.priority} />
                  <span className="text-xs text-slate-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests found"
          description="No requests match this filter yet. Try another status, or raise a new request."
          action={
            <ButtonLink href="/maintenance/new">+ New request</ButtonLink>
          }
        />
      )}
    </div>
  );
}
