import Link from "next/link";

export const metadata = { title: "Sign-in problem — Building Maintenance" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-deep px-4">
      <div className="w-full max-w-md border-t-4 border-t-gold bg-paper p-6 text-center">
        <h1 className="text-lg font-bold text-teal-deep">
          We couldn&apos;t sign you in
        </h1>
        <p className="mt-2 text-sm text-ink">
          The sign-in link may have expired, or the process was cancelled. No
          changes were made to your account.
        </p>
        <Link
          href="/login"
          className="label-mono mt-4 inline-block border border-teal-deep bg-teal-deep px-4 py-2 text-[11px] text-white hover:bg-teal"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
