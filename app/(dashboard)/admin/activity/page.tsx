import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/permissions";

export const metadata = { title: "Activity log — Building Maintenance" };

const PAGE_SIZE = 25;

export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    action?: string;
    entity?: string;
    user?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  // Server-side gate; RLS additionally restricts the query itself.
  if (!isAdmin(current)) redirect("/dashboard");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const fromIdx = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  let query = supabase
    .from("user_activity")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIdx, fromIdx + PAGE_SIZE - 1);

  if (sp.action) query = query.ilike("action", `%${sp.action}%`);
  if (sp.entity) query = query.eq("entity_type", sp.entity);
  if (sp.user) query = query.eq("user_id", sp.user);
  if (sp.from) query = query.gte("created_at", sp.from);
  if (sp.to) query = query.lte("created_at", sp.to + "T23:59:59Z");

  const { data: rows, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Resolve user names in one query.
  const userIds = [
    ...new Set((rows ?? []).map((r) => r.user_id).filter(Boolean)),
  ] as string[];
  const nameByUser = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      nameByUser.set(p.user_id, p.full_name || p.email);
    }
  }

  const qs = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
      if (v) params.set(k, v);
    }
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-teal-deep">Activity log</h1>

      <form
        method="get"
        className="grid grid-cols-1 gap-3 rounded-none border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div>
          <label
            htmlFor="action"
            className="block text-xs font-medium text-ink"
          >
            Action contains
          </label>
          <input
            id="action"
            name="action"
            defaultValue={sp.action ?? ""}
            placeholder="e.g. auth.login"
            className="mt-1 w-full rounded-none border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="entity"
            className="block text-xs font-medium text-ink"
          >
            Entity type
          </label>
          <input
            id="entity"
            name="entity"
            defaultValue={sp.entity ?? ""}
            placeholder="maintenance_request"
            className="mt-1 w-full rounded-none border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-ink">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="mt-1 w-full rounded-none border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-ink">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="mt-1 w-full rounded-none border border-line px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-none bg-teal-deep px-4 py-1.5 text-sm font-semibold text-white hover:bg-teal"
          >
            Filter
          </button>
          <Link
            href="/admin/activity"
            className="label-mono border border-line px-3 py-1.5 text-[11px] text-ink hover:bg-paper"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-none border border-line bg-white">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Description / metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(rows ?? []).map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-ink">
                  {r.user_id
                    ? (nameByUser.get(r.user_id) ?? r.user_id.slice(0, 8))
                    : "system"}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-ink">
                  {r.action}
                </td>
                <td className="px-4 py-2 text-xs text-ink">
                  {r.entity_type}
                  {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
                </td>
                <td className="px-4 py-2 text-xs text-ink">
                  {r.description}
                  {Object.keys(r.metadata ?? {}).length > 0 && (
                    <pre className="mt-1 max-w-md overflow-x-auto rounded bg-paper p-1 text-[11px] text-muted">
                      {JSON.stringify(r.metadata)}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
            {!rows?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No activity matches these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink">
        <span>
          Page {page} of {totalPages} · {count ?? 0} events
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={qs({ page: String(page - 1) })}
              className="rounded-none border border-line px-3 py-1.5 hover:bg-paper"
            >
              ← Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={qs({ page: String(page + 1) })}
              className="rounded-none border border-line px-3 py-1.5 hover:bg-paper"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
