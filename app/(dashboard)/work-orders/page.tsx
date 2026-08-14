import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { completeWorkOrder } from "@/lib/actions/maintenance";

export const metadata = { title: "Work orders — Building Maintenance" };

export default async function WorkOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: workOrders } = await supabase
    .from("work_orders")
    .select(
      "id, title, status, scheduled_for, cost_estimate, request_id, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-teal-deep">Work orders</h1>
      {workOrders?.length ? (
        <ul className="divide-y divide-line rounded-none border border-line bg-white">
          {workOrders.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{w.title}</p>
                <p className="text-xs text-muted">
                  {w.status}
                  {w.scheduled_for
                    ? ` · scheduled ${new Date(w.scheduled_for).toLocaleString()}`
                    : ""}
                  {w.cost_estimate != null ? ` · est. ₹${w.cost_estimate}` : ""}
                </p>
              </div>
              {["assigned", "in_progress", "draft"].includes(w.status) && (
                <form action={completeWorkOrder}>
                  <input type="hidden" name="workOrderId" value={w.id} />
                  <button
                    type="submit"
                    className="rounded-none border border-good bg-good/10 px-3 py-1.5 text-sm font-medium text-good hover:bg-good/10"
                  >
                    Mark completed
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-none border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          No work orders visible to you.
        </div>
      )}
    </div>
  );
}
