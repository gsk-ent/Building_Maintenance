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
      <h2 className="text-lg font-bold text-teal-deep">Sign in</h2>
      <GoogleButton next={next} />
      <div className="label-mono flex items-center gap-3 text-[10px]">
        <div className="h-px flex-1 bg-line" /> or{" "}
        <div className="h-px flex-1 bg-line" />
      </div>
      <LoginForm next={next} />
      <p className="text-center text-sm text-ink">
        No account?{" "}
        <Link
          href="/signup"
          className="font-bold text-teal-deep hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
