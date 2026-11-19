import {
  Archive,
  CheckCircle2,
  CircleDot,
  Clock,
  Loader,
  Pause,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { formatStatus } from "@/lib/format";
import type { DueStatus } from "@/lib/finance/dues";

export type BadgeTone =
  "neutral" | "amber" | "green" | "red" | "blue" | "orange" | "teal";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  green: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  red: "bg-red-100 text-red-800 ring-red-200",
  blue: "bg-sky-100 text-sky-800 ring-sky-200",
  orange: "bg-orange-100 text-orange-800 ring-orange-200",
  teal: "bg-teal-deep/10 text-teal-deep ring-teal-deep/20",
};

/**
 * Status is never conveyed by colour alone: every badge pairs its tone
 * with an icon and a text label.
 */
export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

const REQUEST_STATUS: Record<string, { tone: BadgeTone; icon: LucideIcon }> = {
  open: { tone: "amber", icon: CircleDot },
  triaged: { tone: "blue", icon: Search },
  in_progress: { tone: "blue", icon: Loader },
  on_hold: { tone: "orange", icon: Pause },
  completed: { tone: "green", icon: CheckCircle2 },
  closed: { tone: "neutral", icon: Archive },
  cancelled: { tone: "red", icon: XCircle },
};

/** Single source of truth for maintenance-request status pills. */
export function RequestStatusBadge({ status }: { status: string }) {
  const meta = REQUEST_STATUS[status] ?? {
    tone: "neutral" as BadgeTone,
    icon: CircleDot,
  };
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {formatStatus(status)}
    </Badge>
  );
}

const DUE_STATUS: Record<DueStatus, { tone: BadgeTone; icon: LucideIcon }> = {
  paid: { tone: "green", icon: CheckCircle2 },
  partial: { tone: "amber", icon: Clock },
  pending: { tone: "neutral", icon: Clock },
};

/** Single source of truth for monthly-dues status pills. */
export function DueStatusBadge({ status }: { status: DueStatus }) {
  const meta = DUE_STATUS[status];
  return (
    <Badge tone={meta.tone} icon={meta.icon}>
      {formatStatus(status)}
    </Badge>
  );
}

export const PRIORITY_TONE: Record<string, BadgeTone> = {
  low: "neutral",
  medium: "blue",
  high: "orange",
  urgent: "red",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge tone={PRIORITY_TONE[priority] ?? "neutral"}>
      {formatStatus(priority)}
    </Badge>
  );
}
