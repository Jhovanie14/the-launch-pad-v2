"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, FOCUS_ON_NIGHT } from "./focus";

/**
 * The booking pop-up. On phones it slides up from the bottom so both buttons
 * sit under the thumb; from 640px it is a centred card. Radix traps focus,
 * closes on Escape and announces the title.
 */
export default function BookingSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  header,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
  /** Replaces the plain white title block, e.g. a navy pass-style top. It must render the title itself via BookingSheetTitle. */
  header?: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Animations only under motion-safe: a motion-reduce override loses to
            the data-state selectors' higher specificity. */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-night/60 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex max-h-[92dvh] flex-col overflow-hidden bg-paper text-ink outline-none",
            // Phone: a sheet from the bottom.
            "inset-x-0 bottom-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]",
            "motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-bottom motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-bottom",
            // From 640px: a centred card.
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-0 sm:ring-1 sm:ring-line",
            "sm:motion-safe:data-[state=open]:slide-in-from-bottom-0 sm:motion-safe:data-[state=open]:fade-in-0 sm:motion-safe:data-[state=open]:zoom-in-95 sm:motion-safe:data-[state=closed]:slide-out-to-bottom-0 sm:motion-safe:data-[state=closed]:fade-out-0",
            "duration-200",
            className
          )}
        >
          <div aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {header ?? (
              <div className="px-5 pt-4 pr-14 sm:px-6 sm:pt-6">
                <BookingSheetTitle>{title}</BookingSheetTitle>
                {description && (
                  <DialogPrimitive.Description className="mt-1.5 text-base text-ink-muted">
                    {description}
                  </DialogPrimitive.Description>
                )}
              </div>
            )}
            {header && description && <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>}
            {children && <div className="px-5 pt-4 sm:px-6">{children}</div>}
          </div>
          <div className="flex shrink-0 flex-col gap-2 px-5 pt-5 sm:px-6 sm:pb-6">{footer}</div>
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-4 inline-flex size-11 items-center justify-center rounded-lg sm:top-3",
              header ? cn("text-on-night-muted hover:bg-paper/10", FOCUS_ON_NIGHT) : cn("text-ink-muted hover:bg-line-soft", FOCUS_ON_LIGHT)
            )}
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** The sheet's title (announced by screen readers). Use inside a custom header too. */
export function BookingSheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DialogPrimitive.Title className={cn("text-2xl font-black leading-tight tracking-[-0.025em] text-balance", className)}>
      {children}
    </DialogPrimitive.Title>
  );
}
