"use client";

import { useEffect } from "react";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-fg/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded border bg-bg shadow-2xl",
          "animate-[fadeIn_120ms_ease-out]"
        )}
      >
        <div className="border-b px-5 py-4">
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          {description && (
            <div className="mt-1 text-xs text-muted">{description}</div>
          )}
        </div>
        {children && <div className="px-5 py-4 text-sm">{children}</div>}
        {footer && (
          <div className="flex justify-end gap-2 border-t bg-subtle/40 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
