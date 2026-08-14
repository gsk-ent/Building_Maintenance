import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";

export const metadata = { title: "Maintenance — Building Maintenance" };

const STATUS_BADGE: Record<string, string> = {
  open: "bg-gold/15 text-gold",
  triaged: "bg-rust/10 text-rust",
  in_progress: "bg-teal-deep/10 text-teal-deep",
  on_hold: "bg-paper-2 text-ink",
  completed: "bg-good/10 text-good",
  closed: "bg-line text-ink",
  cancelled: "bg-bad/10 text-bad",
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
    query = query.eq(
      "status",
      status as import("@/types/database").RequestStatus
    );
  }
  const { data: requests } = await query;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-teal-deep">
          Maintenance requests
        </h1>
        <Link
          href="/maintenance/new"
          className="label-mono border border-teal-deep bg-teal-deep px-4 py-2.5 text-[11px] text-white hover:bg-teal"
        >
          + New request
        </Link>
      </div>

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        <Link
          href="/maintenance"
          className={`rounded-sm px-3 py-1 text-xs font-medium ${!status ? "bg-teal-deep text-white" : "bg-white text-ink border border-line"}`}
        >
          All
        </Link>
        {Object.keys(STATUS_BADGE).map((s) => (
          <Link
            key={s}
            href={`/maintenance?status=${s}`}
            className={`rounded-sm px-3 py-1 text-xs font-medium ${status === s ? "bg-teal-deep text-white" : "bg-white text-ink border border-line"}`}
          >
            {s.replace("_", "")}
          </Link>
        ))}
      </nav>

      {requests?.length ? (
        <ul className="divide-y divide-line rounded-none border border-line bg-white">
          {requests.map((r) => (
            <li key={r.id}>
              <Link
                href={`/maintenance/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-paper"
              >
                <span className="text-sm font-medium text-ink">{r.title}</span>
                <span className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-sm px-2 py-0.5 font-medium ${STATUS_BADGE[r.status]}`}
                  >
                    {r.status.replace("_", "")}
                  </span>
                  <span className="text-muted">{r.priority}</span>
                  <span className="text-muted">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-none border border-dashed border-line bg-white p-8 text-center text-sm text-muted">
          No maintenance requests found.
        </div>
      )}
    </div>
  );
}
