import { signOut } from "@/lib/auth/actions";

export function PendingAssignment({ email }: { email: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm">
      <span className="text-3xl">🏠</span>
      <h1 className="text-lg font-bold text-slate-900">Awaiting flat assignment</h1>
      <p className="text-sm text-slate-600">
        Your account (<strong>{email}</strong>) isn&apos;t linked to a flat or
        unit yet. A property manager needs to add you before you can see
        maintenance requests, dues or building expenses.
      </p>
      <p className="text-sm text-slate-600">
        Ask your property manager to add you under{" "}
        <strong>Properties → your building → Members</strong>, using this
        exact email address.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
