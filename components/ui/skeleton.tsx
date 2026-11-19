/**
 * Skeleton loaders (Direction A). The `.animate-shimmer` keyframes live
 * in globals.css. Compose these in `loading.tsx` files — pages are
 * blocking server components, so navigation previously showed a blank
 * wait with no feedback at all.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-shimmer rounded-lg ${className}`}
    />
  );
}

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="mb-3 h-5 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}
