import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xxs uppercase tracking-tight text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xxs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xxs text-danger">{error}</span>}
    </label>
  );
}

const inputBase =
  "block w-full rounded border bg-bg px-3 h-9 text-sm placeholder:text-muted focus:outline-none focus:border-fg/60";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(inputBase, className)} {...rest} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(inputBase, "pr-8", className)} {...rest}>
        {children}
      </select>
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(inputBase, "h-auto py-2", className)}
      {...rest}
    />
  );
});

export function Checkbox({
  label,
  checked,
  onChange,
  className,
}: {
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded-sm border border-border bg-bg accent-fg"
      />
      <span>{label}</span>
    </label>
  );
}
