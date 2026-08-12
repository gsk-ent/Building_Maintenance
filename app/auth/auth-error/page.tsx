import Link from "next/link";

export const metadata = { title: "Sign-in problem — Building Maintenance" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          We couldn&apos;t sign you in
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The sign-in link may have expired, or the process was cancelled. No
          changes were made to your account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}
