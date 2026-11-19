import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager } from "@/lib/permissions";
import { assignRequest, updateRequestStatus } from "@/lib/actions/maintenance";
import { CommentForm } from "@/components/maintenance/comment-form";
import { WorkOrderForm } from "@/components/maintenance/work-order-form";
import { uuidSchema } from "@/lib/validation";
import { formatStatus } from "@/lib/format";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Badge,
  PriorityBadge,
  RequestStatusBadge,
} from "@/components/ui/badge";
import { Select } from "@/components/ui/form";

export const metadata = { title: "Request — Building Maintenance" };

const NEXT_STATUSES: Record<string, string[]> = {
  open: ["triaged", "in_progress", "cancelled"],
  triaged: ["in_progress", "on_hold", "cancelled"],
  in_progress: ["on_hold", "completed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
  completed: ["closed", "in_progress"],
  closed: [],
  cancelled: [],
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("maintenance_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  const manager = isManager(user);
  const canUpdateStatus =
    manager ||
    request.assigned_to === user.id ||
    (request.requested_by === user.id && request.status === "open");

  const [
    { data: comments },
    { data: workOrders },
    { data: staff },
    { data: property },
  ] = await Promise.all([
    supabase
      .from("maintenance_request_comments")
      .select("id, body, created_at, author_id")
      .eq("request_id", id)
      .order("created_at"),
    supabase
      .from("work_orders")
      .select("id, title, status, scheduled_for, assigned_to")
      .eq("request_id", id)
      .order("created_at"),
    manager
      ? supabase
          .from("property_user_assignments")
          .select("user_id, relationship")
          .eq("property_id", request.property_id)
          .in("relationship", ["technician", "manager"])
      : Promise.resolve({
          data: [] as { user_id: string; relationship: string }[],
        }),
    supabase
      .from("properties")
      .select("name")
      .eq("id", request.property_id)
      .maybeSingle(),
  ]);

  // Resolve staff names for the assignment dropdown (managers only).
  let technicianOptions: { id: string; label: string }[] = [];
  if (manager && staff?.length) {
    const ids = [...new Set(staff.map((s) => s.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", ids);
    technicianOptions = (profiles ?? []).map((p) => ({
      id: p.user_id,
      label: p.full_name || p.email,
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {property?.name ?? "Property"}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {request.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <RequestStatusBadge status={request.status} />
          <PriorityBadge priority={request.priority} />
          <span>Created {new Date(request.created_at).toLocaleString()}</span>
        </p>
      </div>

      <Card>
        <CardHeader title="Description" />
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {request.description}
          </p>
        </CardContent>
      </Card>

      {canUpdateStatus && NEXT_STATUSES[request.status]?.length > 0 && (
        <Card>
          <CardHeader title="Update status" />
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {NEXT_STATUSES[request.status].map((s) => (
                <form key={s} action={updateRequestStatus}>
                  <input type="hidden" name="requestId" value={id} />
                  <input type="hidden" name="status" value={s} />
                  <button
                    type="submit"
                    className={buttonClasses("secondary", "sm")}
                  >
                    Mark {formatStatus(s)}
                  </button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {manager && technicianOptions.length > 0 && (
        <Card>
          <CardHeader title="Assign" />
          <CardContent>
            <form
              action={assignRequest}
              className="flex flex-wrap items-end gap-3"
            >
              <input type="hidden" name="requestId" value={id} />
              <Select
                label="Assign to"
                name="assigneeId"
                defaultValue={request.assigned_to ?? ""}
                wrapperClassName="min-w-56 flex-1"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {technicianOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <button type="submit" className={buttonClasses("primary", "md")}>
                Assign
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader title="Work orders" />
        <CardContent>
          {workOrders?.length ? (
            <ul className="mb-4 divide-y divide-slate-200">
              {workOrders.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0"
                >
                  <span className="font-medium text-slate-900">{w.title}</span>
                  <Badge tone="neutral">{formatStatus(w.status)}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">No work orders yet.</p>
          )}
          {manager && (
            <WorkOrderForm requestId={id} technicians={technicianOptions} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={`Comments (${comments?.length ?? 0})`} />
        <CardContent>
          {comments?.length ? (
            <ul className="mb-4 space-y-3">
              {comments.map((c) => (
                <li key={c.id} className="rounded-lg bg-slate-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {c.body}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-4 text-sm text-slate-500">No comments yet.</p>
          )}
          <CommentForm requestId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
