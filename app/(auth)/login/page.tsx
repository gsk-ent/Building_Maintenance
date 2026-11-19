import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata = { title: "Sign in — Building Maintenance" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-slate-900">Sign in</h2>
      <GoogleButton next={next} />
      <div className="label-mono flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" /> or{" "}
        <div className="h-px flex-1 bg-slate-200" />
      </div>
      <LoginForm next={next} />
      <p className="text-center text-sm text-slate-700">
        No account?{" "}
        <Link
          href="/signup"
          className="font-semibold text-teal-deep hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
