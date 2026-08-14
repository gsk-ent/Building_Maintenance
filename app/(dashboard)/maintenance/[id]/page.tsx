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
        <p className="text-xs uppercase tracking-wide text-muted">
          {property?.name ?? "Property"}
        </p>
        <h1 className="text-xl font-bold text-teal-deep">{request.title}</h1>
        <p className="mt-1 text-sm text-muted">
          Status: <strong>{request.status.replace("_", "")}</strong> · Priority:
          {""}
          <strong>{request.priority}</strong> · Created{""}
          {new Date(request.created_at).toLocaleString()}
        </p>
      </div>

      <section className="rounded-none border border-line bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-ink">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-ink">
          {request.description}
        </p>
      </section>

      {canUpdateStatus && NEXT_STATUSES[request.status]?.length > 0 && (
        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Update status
          </h2>
          <div className="flex flex-wrap gap-2">
            {NEXT_STATUSES[request.status].map((s) => (
              <form key={s} action={updateRequestStatus}>
                <input type="hidden" name="requestId" value={id} />
                <input type="hidden" name="status" value={s} />
                <button
                  type="submit"
                  className="label-mono border border-line bg-white px-3 py-1.5 text-[11px] font-medium text-ink hover:bg-paper"
                >
                  Mark {s.replace("_", "")}
                </button>
              </form>
            ))}
          </div>
        </section>
      )}

      {manager && technicianOptions.length > 0 && (
        <section className="rounded-none border border-line bg-white p-4">
          <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
            Assign
          </h2>
          <form
            action={assignRequest}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="requestId" value={id} />
            <div>
              <label
                htmlFor="assigneeId"
                className="block text-sm font-medium text-ink"
              >
                Assign to
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                defaultValue={request.assigned_to ?? ""}
                className="mt-1 rounded-none border border-line bg-white px-3 py-2 text-sm"
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
              className="label-mono border border-teal-deep bg-teal-deep px-4 py-2.5 text-[11px] text-white hover:bg-teal"
            >
              Assign
            </button>
          </form>
        </section>
      )}

      <section className="rounded-none border border-line bg-white p-4">
        <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
          Work orders
        </h2>
        {workOrders?.length ? (
          <ul className="mb-4 divide-y divide-line">
            {workOrders.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="font-medium text-ink">{w.title}</span>
                <span className="text-xs text-muted">{w.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">No work orders yet.</p>
        )}
        {manager && (
          <WorkOrderForm requestId={id} technicians={technicianOptions} />
        )}
      </section>

      <section className="rounded-none border border-line bg-white p-4">
        <h2 className="label-mono mb-3 border-b border-line pb-1.5 text-[11px] text-rust">
          Comments ({comments?.length ?? 0})
        </h2>
        {comments?.length ? (
          <ul className="mb-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-none bg-paper p-3">
                <p className="whitespace-pre-wrap text-sm text-ink">{c.body}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-muted">No comments yet.</p>
        )}
        <CommentForm requestId={id} />
      </section>
    </div>
  );
}
