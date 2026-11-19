import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  canManageProperties,
  getCurrentUser,
  isManager,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Properties — Building Maintenance" };

export default async function PropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageProperties(user)) redirect("/dashboard");

  const supabase = await createClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, address_line1, city, country, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        actions={
          isManager(user) ? (
            <ButtonLink href="/properties/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add property
            </ButtonLink>
          ) : undefined
        }
      />
      {properties?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-deep"
            >
              <h2 className="text-base font-semibold text-slate-900">
                {p.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {p.address_line1}, {p.city}, {p.country}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to get started."
          action={
            isManager(user) ? (
              <ButtonLink href="/properties/new">Add property</ButtonLink>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
