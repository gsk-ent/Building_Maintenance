import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { completeWorkOrder } from "@/lib/actions/maintenance";
import { formatStatus } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";

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
    <div className="space-y-6">
      <PageHeader
        title="Work orders"
        description="Work orders created from maintenance requests."
      />
      {workOrders?.length ? (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
          {workOrders.map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{w.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge tone="neutral">{formatStatus(w.status)}</Badge>
                  {w.scheduled_for
                    ? `Scheduled ${new Date(w.scheduled_for).toLocaleString()}`
                    : ""}
                  {w.cost_estimate != null ? `Est. ₹${w.cost_estimate}` : ""}
                </p>
              </div>
              {["assigned", "in_progress", "draft"].includes(w.status) && (
                <form action={completeWorkOrder}>
                  <input type="hidden" name="workOrderId" value={w.id} />
                  <button
                    type="submit"
                    className={buttonClasses("secondary", "sm")}
                  >
                    Mark completed
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No work orders visible to you"
          description="Work orders appear here once a manager creates one from a maintenance request."
        />
      )}
    </div>
  );
}
