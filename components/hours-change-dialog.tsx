"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  HOURS_NOTICE_EFFECTIVE_LABEL,
  HOURS_NOTICE_KEYS,
  shouldShowHoursNotice,
  type HoursNoticeSurface,
} from "@/lib/announcements/hoursChangeNotice";

interface HoursChangeDialogProps {
  /** Which storage key to use — a dismissal on one surface doesn't hide the other. */
  surface: HoursNoticeSurface;
  /**
   * Only true where we actually know the visitor holds an express detailing
   * plan. The landing page can never know: middleware redirects signed-in
   * users away from "/", so it always passes false.
   */
  showPlanAction?: boolean;
}

export default function HoursChangeDialog({
  surface,
  showPlanAction = false,
}: HoursChangeDialogProps) {
  const [open, setOpen] = useState(false);
  const storageKey = HOURS_NOTICE_KEYS[surface];

  useEffect(() => {
    // Read storage after mount so server and first client render agree.
    // Safari private mode throws on access, hence the try/catch.
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(storageKey) === "1";
    } catch {
      dismissed = false;
    }

    if (!shouldShowHoursNotice({ dismissed, now: new Date() })) return;

    // Let the page paint before interrupting it.
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const dismiss = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Storage blocked — the visitor simply sees the notice again next time.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent
        className="sm:max-w-md p-0 gap-0 overflow-hidden rounded-2xl"
        showCloseButton={false}
      >
        {/* Header band — matches the blue the landing page already uses. */}
        <div className="bg-blue-950 px-6 pt-6 pb-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-1 mb-3">
            <CalendarClock
              className="w-3.5 h-3.5 text-amber-400"
              aria-hidden="true"
            />
            <span className="text-amber-400 text-[11px] font-semibold uppercase tracking-wide">
              Starting {HOURS_NOTICE_EFFECTIVE_LABEL}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-white leading-snug">
            Updated Detailing Hours
          </DialogTitle>
        </div>

        <div className="px-6 pt-5 pb-2">
          <DialogDescription className="sr-only">
            Detailing services move to Thursday through Sunday, 9:30 AM to 6:30
            PM, starting {HOURS_NOTICE_EFFECTIVE_LABEL}.
          </DialogDescription>

          {/* The one fact everything else supports. */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3.5 text-center">
            <p className="text-base font-bold text-blue-950 leading-snug">
              Thursday – Sunday
            </p>
            <p className="text-sm font-medium text-blue-800 mt-0.5">
              9:30 AM – 6:30 PM
            </p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            Self-service bays stay open 24/7. This change gives our team time to
            rest and helps us manage rising costs — thank you for understanding.
          </p>

          {showPlanAction ? (
            <p className="mt-3 rounded-lg bg-gray-50 border px-3.5 py-3 text-sm leading-relaxed text-gray-700">
              <span className="font-semibold text-gray-900">
                You&apos;re on a plan.
              </span>{" "}
              Your pricing stays exactly the same. If the new schedule no longer
              works for you, you can cancel anytime.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">
                Already on a plan?
              </span>{" "}
              Your pricing stays exactly the same.
            </p>
          )}
        </div>

        {/* A plain stack rather than DialogFooter: that component reverses its
            children on mobile, which would bury the primary action. */}
        <div className="flex flex-col gap-2 px-6 pt-4 pb-6">
          <Button
            onClick={dismiss}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white font-semibold"
          >
            Got it
          </Button>
          {showPlanAction && (
            <Button
              asChild
              variant="outline"
              onClick={dismiss}
              className="w-full font-medium"
            >
              <Link href="/dashboard/billing">
                Manage my plan
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
