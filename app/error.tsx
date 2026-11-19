"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route-group error boundary. Previously a failed server component
 * showed Next's default error page; now the user gets a clear message
 * and a retry that re-renders the segment.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <TriangleAlert className="h-6 w-6 text-red-700" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        Something went wrong
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        This page could not be loaded. Your data is safe — try loading it again.
      </p>
      <div className="mt-5 flex justify-center">
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
