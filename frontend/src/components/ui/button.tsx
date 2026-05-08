import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  "inline-flex items-center justify-center rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg hover:opacity-90 border border-accent",
  secondary:
    "bg-bg text-fg border border-border hover:bg-subtle",
  ghost:
    "bg-transparent text-fg hover:bg-subtle border border-transparent",
  danger:
    "bg-bg text-danger border border-border hover:bg-subtle",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xxs",
  md: "h-9 px-3.5 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
});
