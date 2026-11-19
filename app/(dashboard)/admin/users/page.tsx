import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isAdmin } from "@/lib/permissions";
import { RoleBadge } from "@/components/admin/role-badge";
import { GrantRoleForm } from "@/components/admin/grant-role-form";
import type { AppRole } from "@/types/database";
import { formatStatus } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Manage users — Building Maintenance" };

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  if (!isAdmin(current)) redirect("/dashboard");

  const { q } = await searchParams;
  const supabase = await createClient();

  let profileQuery = supabase
    .from("profiles")
    .select("user_id, full_name, email, status, last_login_at, created_at")
    .order("created_at", { ascending: false });
  if (q) profileQuery = profileQuery.ilike("email", `%${q}%`);
  const { data: profiles } = await profileQuery;

  const userIds = (profiles ?? []).map((p) => p.user_id);
  const [{ data: roleRows }, { data: assignments }] = await Promise.all([
    userIds.length
      ? supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase
          .from("property_user_assignments")
          .select("user_id, property_id, relationship, unit_id")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const propertyIds = [
    ...new Set((assignments ?? []).map((a) => a.property_id)),
  ];
  const unitIds = [
    ...new Set(
      (assignments ?? [])
        .map((a) => a.unit_id)
        .filter((id): id is string => !!id)
    ),
  ];
  const [{ data: properties }, { data: units }] = await Promise.all([
    propertyIds.length
      ? supabase.from("properties").select("id, name").in("id", propertyIds)
      : Promise.resolve({ data: [] }),
    unitIds.length
      ? supabase.from("units").select("id, unit_number").in("id", unitIds)
      : Promise.resolve({ data: [] }),
  ]);
  const propertyName = new Map((properties ?? []).map((p) => [p.id, p.name]));
  const unitNumber = new Map((units ?? []).map((u) => [u.id, u.unit_number]));

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roleRows ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(r.role);
    rolesByUser.set(r.user_id, list);
  }
  const assignmentsByUser = new Map<string, typeof assignments>();
  for (const a of assignments ?? []) {
    const list = assignmentsByUser.get(a.user_id) ?? [];
    list.push(a);
    assignmentsByUser.set(a.user_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage users"
        description="Platform-wide roles. To link someone to a specific building or flat, use that property’s Members panel instead."
      />

      <form method="get" className="flex items-end gap-2">
        <div className="w-full max-w-xs">
          <Field
            label="Search by email"
            name="q"
            type="search"
            required={false}
            defaultValue={q ?? ""}
            placeholder="Search by email…"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="space-y-3">
        {(profiles ?? []).map((p) => {
          const roles = rolesByUser.get(p.user_id) ?? [];
          const myAssignments = assignmentsByUser.get(p.user_id) ?? [];
          return (
            <Card key={p.user_id}>
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-900">
                      {p.full_name || "(no name set)"}
                    </p>
                    <p className="text-sm text-slate-500">{p.email}</p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {p.last_login_at
                      ? `Last seen ${new Date(p.last_login_at).toLocaleDateString()}`
                      : "Never signed in"}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {roles.length ? (
                    roles.map((r) => (
                      <RoleBadge key={r} userId={p.user_id} role={r} />
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      No platform role
                    </span>
                  )}
                  <GrantRoleForm userId={p.user_id} />
                </div>

                {myAssignments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-200 pt-3">
                    {myAssignments.map((a, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        {propertyName.get(a!.property_id) ?? "Unknown building"}{" "}
                        · {formatStatus(a!.relationship)}
                        {a!.unit_id
                          ? ` · Unit ${unitNumber.get(a!.unit_id) ?? ""}`
                          : ""}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!profiles?.length && (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Try a different search."
          />
        )}
      </div>
    </div>
  );
}
