"use client";

import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui/button";

const LABEL = "mb-1 block text-sm font-medium text-slate-700";
const INPUT =
  "w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-deep focus:outline-none focus:ring-2 focus:ring-teal-deep/40";

export function Field({
  label,
  name,
  type = "text",
  error,
  autoComplete,
  required = true,
  defaultValue,
  placeholder,
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        step={step}
        min={min}
        max={max}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={INPUT}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextArea({
  label,
  name,
  error,
  rows = 4,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  error?: string;
  rows?: number;
  required?: boolean;
  defaultValue?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={INPUT}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  name,
  error,
  required = true,
  defaultValue,
  children,
  wrapperClassName = "",
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
  wrapperClassName?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={INPUT}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClasses(
        variant === "secondary" ? "secondary" : variant,
        "md",
        "w-full"
      )}
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
    >
      {message}
    </div>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
    >
      {message}
    </div>
  );
}
