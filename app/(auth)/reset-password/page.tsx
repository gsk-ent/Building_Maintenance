import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Choose new password — Building Maintenance" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-teal-deep">
        Choose a new password
      </h2>
      <ResetPasswordForm />
    </div>
  );
}
