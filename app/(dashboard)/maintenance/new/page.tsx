import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/permissions";
import { RequestForm } from "@/components/maintenance/request-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="New maintenance request"
        description="Describe the issue and we'll route it to the right team."
      />
      {properties?.length ? (
        <Card>
          <CardContent>
            <RequestForm
              properties={properties.map((p) => ({ id: p.id, label: p.name }))}
              categories={(categories ?? []).map((c) => ({
                id: c.id,
                label: c.name,
              }))}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={Building2}
          title="No property assigned yet"
          description="You aren't assigned to any property yet. Ask your property manager to add you before creating a request."
        />
      )}
    </div>
  );
}
