import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata = { title: "Sign up — Building Maintenance" };

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-teal-deep">Create your account</h2>
      <GoogleButton />
      <div className="label-mono flex items-center gap-3 text-[10px]">
        <div className="h-px flex-1 bg-line" /> or{" "}
        <div className="h-px flex-1 bg-line" />
      </div>
      <SignupForm />
      <p className="text-center text-sm text-ink">
        Already registered?{" "}
        <Link
          href="/login"
          className="font-bold text-teal-deep hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
