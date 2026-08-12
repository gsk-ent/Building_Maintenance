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
    .select("id, title, status, scheduled_for, cost_estimate, request_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Work orders</h1>
      {workOrders?.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {workOrders.map((w) => (
            <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{w.title}</p>
                <p className="text-xs text-slate-500">
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
                    className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                  >
                    Mark completed
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No work orders visible to you.
        </div>
      )}
    </div>
  );
}
