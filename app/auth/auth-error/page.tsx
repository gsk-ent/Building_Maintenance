import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Sign-in problem — Building Maintenance" };

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-teal-deep px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">
          We couldn&apos;t sign you in
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          The sign-in link may have expired, or the process was cancelled. No
          changes were made to your account.
        </p>
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/login">Try again</ButtonLink>
        </div>
      </div>
    </main>
  );
}
