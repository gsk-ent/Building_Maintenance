import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

/**
 * Global 404. Previously missing records fell through to Next's
 * default 404 page; now the user gets a branded page with a way back.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <FileQuestion className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          Page not found
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          The page you are looking for does not exist, or the record may have
          been removed.
        </p>
        <div className="mt-5 flex justify-center">
          <ButtonLink href="/dashboard">Go to dashboard</ButtonLink>
        </div>
      </div>
    </main>
  );
}
