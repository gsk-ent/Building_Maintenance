import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_LABELS } from "@/lib/permissions";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const metadata = { title: "Profile — Building Maintenance" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Your profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="mb-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Roles</dt>
            <dd className="font-medium text-slate-800">
              {user.roles.map((r) => ROLE_LABELS[r]).join(", ") || "None"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Last sign-in</dt>
            <dd className="font-medium text-slate-800">
              {user.profile?.last_login_at
                ? new Date(user.profile.last_login_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Sign-in count</dt>
            <dd className="font-medium text-slate-800">{user.profile?.login_count ?? 0}</dd>
          </div>
        </dl>
        <ProfileForm
          fullName={user.profile?.full_name ?? ""}
          phone={user.profile?.phone ?? ""}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <h2 className="mb-1 font-semibold text-slate-900">Password</h2>
        <p className="mb-3 text-slate-600">
          To change your password, use the password reset flow.
        </p>
        <Link href="/forgot-password" className="font-medium text-blue-600 hover:underline">
          Reset password →
        </Link>
      </div>
    </div>
  );
}
