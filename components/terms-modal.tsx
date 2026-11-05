"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

// Rendered in a portal, outside .lp-theme, so every colour is an explicit token.
const FOCUS_LIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const KEY_TERMS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "Services and location",
    body: (
      <p>
        We operate at <strong className="text-ink">10410 S Main St, Houston, TX 77025</strong>.
        We offer drive-through car wash services, subscription plans
        (monthly/yearly), and various add-ons.
      </p>
    ),
  },
  {
    title: "Subscription plans",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-ink">AutoPay (opt-in):</strong> recurring
          charges until you cancel with 30 days&apos; notice
        </li>
        <li>
          <strong className="text-ink">Manual renewal:</strong> your access ends
          at the term&apos;s close unless you proactively pay for the next term
        </li>
        <li>Each vehicle requires its own separate subscription</li>
      </ul>
    ),
  },
  {
    title: "Cancellation and refunds",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-ink">Individual services:</strong> cancel 24+
          hours before for a full refund
        </li>
        <li>
          <strong className="text-ink">Subscriptions:</strong> no refunds for
          partial months or unused time
        </li>
        <li>
          <strong className="text-ink">AutoPay:</strong> cancel with 30 days&apos;
          advance notice
        </li>
      </ul>
    ),
  },
  {
    title: "Violation and termination",
    body: (
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          <strong className="text-ink">Investigation and enforcement:</strong> we
          may investigate violations of this Agreement or law and pursue
          available remedies, including cooperating with law enforcement.
        </li>
        <li>
          <strong className="text-ink">Suspension and cancellation:</strong> we
          may suspend access or cancel your subscription and terminate this
          Agreement if you breach it (including non-payment, misuse, or abuse).
        </li>
        <li>
          <strong className="text-ink">Refusal of service:</strong> we may refuse
          service or access to any person or vehicle at any time for any lawful
          reason, including safety, equipment limitations, or misuse.
        </li>
      </ul>
    ),
  },
  {
    title: "Payment terms",
    body: (
      <p>
        Payment is due at the start of each subscription term (online or cash).
        If payment is not received, access is paused until payment is made.
      </p>
    ),
  },
  {
    title: "Limitation of liability",
    body: (
      <p className="font-semibold text-ink">
        Services are provided &ldquo;AS IS.&rdquo; We are not liable for
        consequential damages. Maximum liability is limited to 3x your most
        recent payment or $100, whichever is greater.
      </p>
    ),
  },
  {
    title: "Arbitration and class action waiver",
    body: (
      <p>
        Disputes are resolved by binding arbitration (except small claims
        matters). You agree not to participate in class actions. You may opt
        out within 30 days by mailing written notice to our address.
      </p>
    ),
  },
];

export default function TermsModal({
  isOpen,
  onClose,
  onAccept,
}: TermsModalProps) {
  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-night/70 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-paper text-ink shadow-[0_24px_48px_-24px_rgb(8_20_52/0.6)] ring-1 ring-line duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 motion-reduce:animate-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
            <div>
              <DialogTitle className="text-xl font-black tracking-tight text-ink sm:text-2xl">
                Terms of Service
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-ink-muted">
                A summary of the key terms. The full terms are linked at the end.
              </DialogDescription>
            </div>
            <DialogPrimitive.Close
              className={`-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-line-soft hover:text-ink ${FOCUS_LIGHT}`}
              aria-label="Close terms"
            >
              <X aria-hidden className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="max-w-prose space-y-6 text-sm leading-relaxed text-ink-muted">
              <section className="space-y-4">
                <p>
                  This Terms of Service Agreement (this &ldquo;Agreement&rdquo;)
                  is a binding contract between you (&ldquo;Customer,&rdquo;
                  &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and The Launch Pad
                  (&ldquo;The Launch Pad,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo;
                  or &ldquo;our&rdquo;). This Agreement governs your access to and
                  use of our car-wash services, subscription plans, add-ons, and
                  related offerings (collectively, the &ldquo;Services&rdquo;).
                </p>
                <p className="rounded-lg bg-canvas p-4 font-semibold text-ink ring-1 ring-line">
                  THIS AGREEMENT TAKES EFFECT WHEN YOU CLICK &ldquo;ACCEPT,&rdquo;
                  CREATE AN ACCOUNT, OR ACCESS OR USE THE SERVICES. BY DOING SO
                  YOU AGREE TO BE LEGALLY BOUND BY IT. IF YOU DO NOT AGREE, DO
                  NOT USE THE SERVICES.
                </p>
                <p className="font-semibold text-ink">
                  YOU ALSO AGREE TO THE ARBITRATION AGREEMENT AND CLASS ACTION
                  WAIVER IN SECTION 9.3 (EXCEPT FOR MATTERS THAT MAY BE TAKEN TO
                  SMALL CLAIMS COURT).
                </p>
              </section>

              <section aria-labelledby="terms-key">
                <h3 id="terms-key" className="text-base font-black tracking-tight text-ink">
                  Key terms
                </h3>
                <ul className="mt-2 divide-y divide-line-soft border-y border-line-soft">
                  {KEY_TERMS.map((term) => (
                    <li key={term.title} className="py-4">
                      <h4 className="font-bold text-ink">{term.title}</h4>
                      <div className="mt-1.5">{term.body}</div>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="terms-contact">
                <h3 id="terms-contact" className="text-base font-black tracking-tight text-ink">
                  Contact
                </h3>
                <dl className="mt-2 space-y-1.5">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-ink">Address</dt>
                    <dd>10410 S Main St, Houston, TX 77025</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-ink">Phone</dt>
                    <dd>
                      <a
                        href="tel:832-219-8320"
                        className={`rounded-sm font-semibold text-brand-blue underline underline-offset-4 hover:text-ink ${FOCUS_LIGHT}`}
                      >
                        832-219-8320
                      </a>
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="font-semibold text-ink">Email</dt>
                    <dd>
                      <a
                        href="mailto:info@thelaunchpadwash.com"
                        className={`rounded-sm font-semibold break-all text-brand-blue underline underline-offset-4 hover:text-ink ${FOCUS_LIGHT}`}
                      >
                        info@thelaunchpadwash.com
                      </a>
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="border-t border-line-soft pt-5">
                <p>
                  This is a summary of our key terms. For complete details,
                  please read the full Terms of Service.
                </p>
                <Link
                  href="/terms"
                  target="_blank"
                  className={`-ml-2 mt-1 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-semibold text-brand-blue hover:bg-line-soft ${FOCUS_LIGHT}`}
                >
                  Read the full Terms of Service
                  <ExternalLink aria-hidden className="size-4" />
                  <span className="sr-only">(opens in a new tab)</span>
                </Link>
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-line bg-canvas px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <p className="text-xs text-ink-muted">
              By selecting &ldquo;I accept,&rdquo; you agree to these terms.
            </p>
            <button
              type="button"
              onClick={handleAccept}
              className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-night px-6 font-semibold text-on-night transition-colors hover:bg-night-raised ${FOCUS_LIGHT}`}
            >
              I accept
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
