import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_LABELS } from "@/lib/permissions";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const metadata = { title: "Profile — Building Maintenance" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Your profile"
        description="Your account details and contact information."
      />

      <Card>
        <CardHeader title="Account details" />
        <CardContent>
          <dl className="mb-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-500">Email</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Roles</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {user.roles.map((r) => ROLE_LABELS[r]).join(",") || "None"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Last sign-in</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {user.profile?.last_login_at
                  ? new Date(user.profile.last_login_at).toLocaleString()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Sign-in count</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {user.profile?.login_count ?? 0}
              </dd>
            </div>
          </dl>
          <ProfileForm
            fullName={user.profile?.full_name ?? ""}
            phone={user.profile?.phone ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Password" />
        <CardContent>
          <p className="mb-3 text-sm text-slate-700">
            To change your password, use the password reset flow.
          </p>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-teal-deep hover:underline"
          >
            Reset password →
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
