"use client";

import { useFormStatus } from "react-dom";

export function Field({
  label,
  name,
  type = "text",
  error,
  autoComplete,
  required = true,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
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
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
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
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
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
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
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
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      >
        {children}
      </select>
      {error && (
        <p role="alert" className="text-sm text-red-600">
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
  const styles =
    variant === "primary"
      ? "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-300"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-300"
        : "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-300";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 ${styles}`}
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
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
      className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
    >
      {message}
    </div>
  );
}
