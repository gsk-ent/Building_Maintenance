import { redirect } from "next/navigation";
import { PropertyForm } from "@/components/dashboard/property-form";
import { getCurrentUser, isManager } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add property — Building Maintenance" };

export default async function NewPropertyPage() {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Add property" />
      <Card>
        <CardContent>
          <PropertyForm />
        </CardContent>
      </Card>
    </div>
  );
}
