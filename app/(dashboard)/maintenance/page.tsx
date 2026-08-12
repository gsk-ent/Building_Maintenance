import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

export const metadata = { title: "Maintenance — Building Maintenance" };

const STATUS_BADGE: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  triaged: "bg-purple-100 text-purple-800",
  in_progress: "bg-blue-100 text-blue-800",
  on_hold: "bg-slate-100 text-slate-700",
  completed: "bg-green-100 text-green-800",
  closed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

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
  if (status && status in STATUS_BADGE) {
    query = query.eq("status", status as import("@/types/database").RequestStatus);
  }
  const { data: requests } = await query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Maintenance requests</h1>
        <Link
          href="/maintenance/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + New request
        </Link>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <Link
          href="/maintenance"
          className={`rounded-full px-3 py-1 text-xs font-medium ${!status ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
        >
          All
        </Link>
        {Object.keys(STATUS_BADGE).map((s) => (
          <Link
            key={s}
            href={`/maintenance?status=${s}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-300"}`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </nav>

      {requests?.length ? (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/maintenance/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <span className="text-sm font-medium text-slate-800">{r.title}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status.replace("_", " ")}
                  </span>
                  <span className="text-slate-500">{r.priority}</span>
                  <span className="text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No maintenance requests found.
        </div>
      )}
    </div>
  );
}
