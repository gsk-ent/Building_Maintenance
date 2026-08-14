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
      <h1 className="text-xl font-bold text-teal-deep">Your profile</h1>

      <div className="rounded-none border border-line bg-white p-5">
        <dl className="mb-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-ink">{user.email}</dd>
          </div>
          <div>
            <dt className="text-muted">Roles</dt>
            <dd className="font-medium text-ink">
              {user.roles.map((r) => ROLE_LABELS[r]).join(",") || "None"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Last sign-in</dt>
            <dd className="font-medium text-ink">
              {user.profile?.last_login_at
                ? new Date(user.profile.last_login_at).toLocaleString()
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Sign-in count</dt>
            <dd className="font-medium text-ink">
              {user.profile?.login_count ?? 0}
            </dd>
          </div>
        </dl>
        <ProfileForm
          fullName={user.profile?.full_name ?? ""}
          phone={user.profile?.phone ?? ""}
        />
      </div>

      <div className="rounded-none border border-line bg-white p-5 text-sm">
        <h2 className="mb-1 font-semibold text-ink">Password</h2>
        <p className="mb-3 text-ink">
          To change your password, use the password reset flow.
        </p>
        <Link
          href="/forgot-password"
          className="font-medium text-teal-deep hover:underline"
        >
          Reset password →
        </Link>
      </div>
    </div>
  );
}
