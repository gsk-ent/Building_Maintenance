import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Field } from "@/components/ui/form";
import { Button, ButtonLink } from "@/components/ui/button";

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
    <div className="space-y-6">
      <PageHeader title="Activity log" />

      <Card>
        <CardContent>
          <form
            method="get"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <Field
              label="Action contains"
              name="action"
              required={false}
              defaultValue={sp.action ?? ""}
              placeholder="e.g. auth.login"
            />
            <Field
              label="Entity type"
              name="entity"
              required={false}
              defaultValue={sp.entity ?? ""}
              placeholder="maintenance_request"
            />
            <Field
              label="From"
              name="from"
              type="date"
              required={false}
              defaultValue={sp.from ?? ""}
            />
            <Field
              label="To"
              name="to"
              type="date"
              required={false}
              defaultValue={sp.to ?? ""}
            />
            <div className="flex items-end gap-2">
              <Button type="submit">Filter</Button>
              <ButtonLink href="/admin/activity" variant="secondary">
                Clear
              </ButtonLink>
            </div>
          </form>
        </CardContent>
      </Card>

      <Table caption="Platform activity log">
        <TableHead>
          <TableHeaderCell>Time</TableHeaderCell>
          <TableHeaderCell>User</TableHeaderCell>
          <TableHeaderCell>Action</TableHeaderCell>
          <TableHeaderCell>Entity</TableHeaderCell>
          <TableHeaderCell>Description / metadata</TableHeaderCell>
        </TableHead>
        <TableBody>
          {(rows ?? []).map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap text-xs text-slate-500">
                {new Date(r.created_at).toLocaleString()}
              </TableCell>
              <TableCell>
                {r.user_id
                  ? (nameByUser.get(r.user_id) ?? r.user_id.slice(0, 8))
                  : "system"}
              </TableCell>
              <TableCell className="font-mono text-xs">{r.action}</TableCell>
              <TableCell className="text-xs">
                {r.entity_type}
                {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}…` : ""}
              </TableCell>
              <TableCell className="text-xs">
                {r.description}
                {Object.keys(r.metadata ?? {}).length > 0 && (
                  <pre className="mt-1 max-w-md overflow-x-auto rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500">
                    {JSON.stringify(r.metadata)}
                  </pre>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!rows?.length && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="py-8 text-center text-slate-500"
              >
                No activity matches these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>
          Page {page} of {totalPages} · {count ?? 0} events
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <ButtonLink
              href={qs({ page: String(page - 1) })}
              variant="secondary"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </ButtonLink>
          )}
          {page < totalPages && (
            <ButtonLink
              href={qs({ page: String(page + 1) })}
              variant="secondary"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}
