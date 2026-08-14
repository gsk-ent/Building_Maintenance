import { signOut } from "@/lib/auth/actions";

export function PendingAssignment({ email }: { email: string }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 border border-gold bg-white p-6 text-center">
      <span className="text-3xl">🏠</span>
      <h1 className="text-lg font-bold text-teal-deep">
        Awaiting flat assignment
      </h1>
      <p className="text-sm text-ink">
        Your account (<strong>{email}</strong>) isn&apos;t linked to a flat or
        unit yet. A property manager needs to add you before you can see
        maintenance requests, dues or building expenses.
      </p>
      <p className="text-sm text-ink">
        Ask your property manager to add you under{" "}
        <strong>Properties → your building → Members</strong>, using this exact
        email address.
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="label-mono border border-line bg-white px-4 py-2 text-[11px] text-teal-deep hover:bg-paper-2"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
