import Link from "next/link";
import type { ReactNode } from "react";

export type ButtonVariant =
  "primary" | "secondary" | "danger" | "ghost" | "subtle";
export type ButtonSize = "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-teal-deep text-white hover:bg-teal focus-visible:ring-teal-deep",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-teal-deep",
  danger: "bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700",
  ghost: "text-slate-700 hover:bg-slate-100 focus-visible:ring-teal-deep",
  subtle:
    "bg-teal-deep/10 text-teal-deep hover:bg-teal-deep/15 focus-visible:ring-teal-deep",
};

const SIZES: Record<ButtonSize, string> = {
  // 44px minimum height on the default size — the old 10.5px nav links and
  // px-3 py-1 pills were far below a comfortable touch target.
  md: "min-h-11 px-4 py-2.5 text-sm",
  sm: "min-h-9 px-3 py-1.5 text-sm",
};

export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = ""
): string {
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type="button"
      className={buttonClasses(variant, size, className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
