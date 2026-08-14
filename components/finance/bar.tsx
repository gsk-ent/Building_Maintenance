export function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-ink">{label}</span>
      <div className="h-4 flex-1 rounded bg-paper-2">
        <div className="h-4 rounded bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 shrink-0 text-right font-medium text-ink">
        {value}
      </span>
    </div>
  );
}
