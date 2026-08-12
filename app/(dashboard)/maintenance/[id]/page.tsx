import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isManager } from "@/lib/permissions";
import { assignRequest, updateRequestStatus } from "@/lib/actions/maintenance";
import { CommentForm } from "@/components/maintenance/comment-form";
import { WorkOrderForm } from "@/components/maintenance/work-order-form";
import { uuidSchema } from "@/lib/validation";

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
    manager || request.assigned_to === user.id ||
    (request.requested_by === user.id && request.status === "open");

  const [{ data: comments }, { data: workOrders }, { data: staff }, { data: property }] =
    await Promise.all([
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
        : Promise.resolve({ data: [] as { user_id: string; relationship: string }[] }),
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
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {property?.name ?? "Property"}
        </p>
        <h1 className="text-xl font-bold text-slate-900">{request.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Status: <strong>{request.status.replace("_", " ")}</strong> · Priority:{" "}
          <strong>{request.priority}</strong> · Created{" "}
          {new Date(request.created_at).toLocaleString()}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{request.description}</p>
      </section>

      {canUpdateStatus && NEXT_STATUSES[request.status]?.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Update status</h2>
          <div className="flex flex-wrap gap-2">
            {NEXT_STATUSES[request.status].map((s) => (
              <form key={s} action={updateRequestStatus}>
                <input type="hidden" name="requestId" value={id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Mark {s.replace("_", " ")}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {manager && technicianOptions.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Assign</h2>
          <form action={assignRequest} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="requestId" value={id} />
            <div>
              <label htmlFor="assigneeId" className="block text-sm font-medium text-slate-700">
                Assign to
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                defaultValue={request.assigned_to ?? ""}
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {technicianOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Assign
            </button>
          </form>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Work orders</h2>
        {workOrders?.length ? (
          <ul className="mb-4 divide-y divide-slate-100">
            {workOrders.map((w) => (
              <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-800">{w.title}</span>
                <span className="text-xs text-slate-500">{w.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">No work orders yet.</p>
        )}
        {manager && (
          <WorkOrderForm requestId={id} technicians={technicianOptions} />
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          Comments ({comments?.length ?? 0})
        </h2>
        {comments?.length ? (
          <ul className="mb-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-3">
                <p className="whitespace-pre-wrap text-sm text-slate-700">{c.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-slate-500">No comments yet.</p>
        )}
        <CommentForm requestId={id} />
      </section>
    </div>
  );
}
