import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { RequestForm } from "@/components/maintenance/request-form";

export const metadata = { title: "New request — Building Maintenance" };

export default async function NewRequestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: properties }, { data: categories }] = await Promise.all([
    supabase.from("properties").select("id, name").order("name"),
    supabase.from("maintenance_categories").select("id, name").order("name"),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold text-slate-900">New maintenance request</h1>
      {properties?.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <RequestForm
            properties={properties.map((p) => ({ id: p.id, label: p.name }))}
            categories={(categories ?? []).map((c) => ({ id: c.id, label: c.name }))}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          You aren&apos;t assigned to any property yet. Ask your property manager
          to add you before creating a request.
        </div>
      )}
    </div>
  );
}
