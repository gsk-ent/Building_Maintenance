import { Home } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { buttonClasses } from "@/components/ui/button";

export function PendingAssignment({ email }: { email: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-deep/10">
        <Home className="h-6 w-6 text-teal-deep" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold tracking-tight text-slate-900">
        Awaiting flat assignment
      </h1>
      <p className="text-sm text-slate-700">
        Your account (<strong>{email}</strong>) isn&apos;t linked to a flat or
        unit yet. A property manager needs to add you before you can see
        maintenance requests, dues or building expenses.
      </p>
      <p className="text-sm text-slate-700">
        Ask your property manager to add you under{" "}
        <strong>Properties → your building → Members</strong>, using this exact
        email address.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className={buttonClasses("secondary", "md", "w-full sm:w-auto")}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
