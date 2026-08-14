import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = { title: "Reset password — Building Maintenance" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-teal-deep">Reset your password</h2>
      <p className="text-sm text-ink">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <ForgotPasswordForm />
      <p className="text-center text-sm">
        <Link
          href="/login"
          className="font-bold text-teal-deep hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
