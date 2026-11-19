import Link from "next/link";
import { Check, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Receipt } from "@/lib/booking/bookingReceipt";
import BookingTicket from "./BookingTicket";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, RING_BUTTON, SURFACE } from "./ui/focus";

const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * What both "you're booked" pages show: the appointment as a navy ticket,
 * a receipt whose total is what was actually charged, and the next step.
 */
export default function BookingReceipt({
  receipt,
  action,
}: {
  receipt: Receipt;
  /** The page's one flame button. */
  action: { href: string; label: string };
}) {
  const linkClass = cn("rounded font-semibold text-ink underline underline-offset-4", FOCUS_ON_LIGHT);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <span className="flex size-10 items-center justify-center rounded-full bg-night text-flame" aria-hidden>
          <Check className="size-6" strokeWidth={3} />
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.025em] text-balance">{receipt.title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-muted">
          We&apos;ve emailed your confirmation. See you at 10410 S Main St.
        </p>
      </div>

      <BookingTicket
        day={receipt.day}
        time={receipt.time}
        serviceName={receipt.serviceName}
        extras={receipt.extras.map((e) => e.name)}
        durationMin={receipt.durationMin}
        plate={receipt.plate}
        vehicle={receipt.vehicle}
      />

      <section aria-labelledby="receipt-title" className={cn(SURFACE, "p-5 sm:p-7")}>
        <h2 id="receipt-title" className="text-xl font-black tracking-[-0.025em]">
          Receipt
        </h2>
        <dl className="mt-3 divide-y divide-line-soft text-base">
          <div className="flex justify-between gap-4 py-2.5">
            <dt>{receipt.serviceName}</dt>
            <dd className="tabular-nums">{receipt.serviceFree ? "Free" : money(receipt.servicePrice)}</dd>
          </div>
          {receipt.extras.map((e, i) => (
            <div key={i} className="flex justify-between gap-4 py-2.5">
              <dt>{e.name}</dt>
              <dd className="tabular-nums">{money(e.price)}</dd>
            </div>
          ))}
          {receipt.discount && (
            <div className="flex justify-between gap-4 py-2.5 text-ink-muted">
              <dt>{receipt.discount.label}</dt>
              <dd className="tabular-nums">−{money(receipt.discount.amount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-4 pt-3 text-lg font-black tracking-[-0.02em]">
            <dt>{receipt.kind === "card" ? "Total paid" : "Total"}</dt>
            <dd className="tabular-nums">{money(receipt.total)}</dd>
          </div>
        </dl>
        <p className="mt-3 break-all text-sm text-ink-subtle">
          {receipt.paidWith} · {receipt.reference}
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={action.href} className={FLAME_BUTTON}>
          {action.label}
        </Link>
        <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={cn(RING_BUTTON, "h-12 text-base")}>
          <MapPin className="size-4 text-brand-blue" aria-hidden />
          Get directions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>

      <p className="text-sm text-ink-muted">
        Need to change something? Call{" "}
        <a href="tel:+18322198320" className={linkClass}>
          (832) 219-8320
        </a>{" "}
        or email{" "}
        <a href="mailto:info@thelaunchpadwash.com" className={linkClass}>
          info@thelaunchpadwash.com
        </a>
        .
      </p>
    </div>
  );
}
