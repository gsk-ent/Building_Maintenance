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
      <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
      <GoogleButton next={next} />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
      </div>
      <LoginForm next={next} />
      <p className="text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
