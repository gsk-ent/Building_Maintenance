import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <FileQuestion className="h-6 w-6 text-slate-500" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        This record could not be found
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        It may have been removed, or you may not have access to it.
      </p>
      <div className="mt-5 flex justify-center">
        <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
      </div>
    </div>
  );
}
