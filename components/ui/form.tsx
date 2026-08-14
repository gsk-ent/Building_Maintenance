"use client";

import { useFormStatus } from "react-dom";

const LABEL = "label-mono mb-1 block text-[11px]";
const INPUT =
  "w-full rounded-none border border-line bg-paper-2 px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-teal-deep focus:outline-none focus:ring-1 focus:ring-teal-deep";

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
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={!!error}
        className={INPUT}
      >
        {children}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-sm text-bad">
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
      ? "border border-teal-deep bg-teal-deep text-white hover:bg-teal"
      : variant === "danger"
        ? "border border-bad bg-bad text-white hover:opacity-90"
        : "border border-dashed border-teal bg-transparent text-teal-deep hover:bg-paper-2";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`label-mono inline-flex w-full items-center justify-center rounded-none px-4 py-2.5 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60 ${styles}`}
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
      className="border border-bad bg-bad/10 px-3 py-2 text-sm text-bad"
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
      className="border border-good bg-good/10 px-3 py-2 text-sm text-good"
    >
      {message}
    </div>
  );
}
