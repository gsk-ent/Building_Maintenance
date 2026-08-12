import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata = { title: "Sign up — Building Maintenance" };

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Create your account</h2>
      <GoogleButton />
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" /> or <div className="h-px flex-1 bg-slate-200" />
      </div>
      <SignupForm />
      <p className="text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
