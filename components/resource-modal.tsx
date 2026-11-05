"use client";

import Link from "next/link";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "guide" | "tutorials" | null;
}

const LINK = cn(
  "rounded font-semibold text-ink underline underline-offset-4 hover:text-brand-blue",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

type Step = { title: string; body: React.ReactNode };

/**
 * Short, true guides to the customer area. Every step points at a real
 * screen; nothing here promises a video or a feature that doesn't exist.
 */
export function ResourceModal({ isOpen, onClose, type }: ResourceModalProps) {
  const go = (href: string, label: string) => (
    <Link href={href} onClick={onClose} className={LINK}>
      {label}
    </Link>
  );

  const content: Record<"guide" | "tutorials", { title: string; intro: string; steps: Step[] }> = {
    guide: {
      title: "Getting started",
      intro: "Three services at one location: self-service bays, express detailing, and a membership.",
      steps: [
        {
          title: "Book an express detail",
          body: (
            <>
              Tap <strong>Book</strong>, choose a service, pick a date and time, and pay
              online. Express detailing runs Thursday to Sunday, 9:30 AM to 6:30 PM. Your bookings live
              under {go("/dashboard/bookings", "Bookings")}.
            </>
          ),
        },
        {
          title: "Use the self-service bays",
          body: (
            <>
              The bays at 10410 S Main St are open 24/7. Pay with tap-to-pay or dollar coins. Your bay
              visits show under {go("/dashboard/self-service-log", "Self-service")}.
            </>
          ),
        },
        {
          title: "Join the membership",
          body: (
            <>
              One price for express detailing, billed monthly or yearly, with no contract. Compare plans
              under {go("/dashboard/pricing", "Membership")}.
            </>
          ),
        },
        {
          title: "Show your membership at the bay",
          body: (
            <>
              On {go("/dashboard", "Home")}, tap <strong>Show at the bay</strong>. Your name, plan and
              plates fill the screen so staff can check them at a glance.
            </>
          ),
        },
        {
          title: "Shop car care",
          body: (
            <>
              Buy products online and pick them up at the shop or have them delivered locally. Track them
              under {go("/dashboard/orders", "Orders")}.
            </>
          ),
        },
      ],
    },
    tutorials: {
      title: "How do I…",
      intro: "The common account tasks, and where to do them.",
      steps: [
        {
          title: "Add a vehicle to my membership",
          body: (
            <>
              Go to {go("/dashboard/billing", "Billing")} and choose <strong>Add a vehicle</strong>. You
              can change vehicles once every 6 months.
            </>
          ),
        },
        {
          title: "Unsubscribe a vehicle",
          body: (
            <>
              In {go("/dashboard/billing", "Billing")}, choose <strong>Unsubscribe</strong> next to the
              car. To unsubscribe your primary vehicle, you&apos;ll pick a new primary vehicle first.
            </>
          ),
        },
        {
          title: "Update my payment card",
          body: (
            <>
              In {go("/dashboard/billing", "Billing")}, choose <strong>Update payment method</strong>.
              It opens Stripe&apos;s secure page.
            </>
          ),
        },
        {
          title: "Change or cancel my membership",
          body: (
            <>
              Switch plans under {go("/dashboard/pricing", "Membership")}. To cancel, use{" "}
              <strong>Cancel membership</strong> at the bottom of {go("/dashboard/billing", "Billing")};
              you keep your washes until the end of the billing period.
            </>
          ),
        },
        {
          title: "Save a car for faster booking",
          body: (
            <>
              Add it under {go("/dashboard/settings", "Settings")}. Saved cars aren&apos;t added to your
              membership.
            </>
          ),
        },
        {
          title: "Get help with something else",
          body: (
            <>
              Close this and send us a message from <strong>Contact us</strong>, or call (832) 219-8320.
            </>
          ),
        },
      ],
    },
  };

  const page = type ? content[type] : null;

  return (
    <Dialog open={isOpen && !!page} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="lp-theme max-h-[90dvh] overflow-y-auto rounded-2xl border-line bg-paper p-5 text-ink motion-reduce:animate-none sm:max-w-2xl sm:p-7"
      >
        {page && (
          <>
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Close</span>
            </button>
            <DialogTitle className="pr-8 text-2xl font-black tracking-tight text-ink">
              {page.title}
            </DialogTitle>
            <DialogDescription className="text-ink-muted">{page.intro}</DialogDescription>
            <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
              {page.steps.map((step) => (
                <li key={step.title} className="py-4">
                  <h3 className="font-bold text-ink">{step.title}</h3>
                  <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">{step.body}</p>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 self-start rounded-lg bg-night px-5 font-semibold text-on-night hover:bg-night-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Done
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
