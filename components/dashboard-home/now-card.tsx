"use client";

import Image from "next/image";
import Link from "next/link";
import { useId } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import {
  formatAppointment,
  formatClock,
  vehicleLabel,
  type NowItem,
} from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";

export const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";

const primaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-bright";
const quietAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 font-semibold text-on-night transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame";

const heading = "text-3xl font-black tracking-tight text-balance sm:text-4xl";

/**
 * The one most time-sensitive thing: a bay session in progress, the next
 * detail, an order to collect. With nothing pending it becomes the booking
 * prompt, or for a brand-new customer an introduction to the three services.
 * `hasPass`: a membership pass above already carries the amber action, so
 * this card keeps its own actions quiet.
 */
export function NowCard({
  now,
  isMember,
  isNewCustomer,
  hasPass,
  onBook,
}: {
  now: NowItem | null;
  isMember: boolean;
  isNewCustomer: boolean;
  hasPass: boolean;
  onBook: () => void;
}) {
  const id = useId();
  const lead = hasPass ? quietAction : primaryAction;

  if (now?.kind === "checked_in") {
    return (
      <Shell id={id}>
        <h2 id={id} className={heading}>
          You&apos;re checked in since {formatClock(now.log.check_in_time)}
        </h2>
        <p className="mt-1 text-on-night-muted">
          <span className="font-semibold text-svc-self">Self-service bay</span>
          {now.log.vehicle && ` · ${vehicleLabel(now.log.vehicle)}`}
        </p>
      </Shell>
    );
  }

  if (now?.kind === "upcoming" && now.booking.appointment_date) {
    const b = now.booking;
    const date = now.booking.appointment_date;
    return (
      <Shell id={id}>
        <h2 id={id} className={heading}>
          {formatAppointment(date, b.appointment_time)
            .split(" · ")
            .map((part, i) => (
              <span key={part} className="whitespace-nowrap">
                {i > 0 && " · "}
                {part}
              </span>
            ))}
        </h2>
        <p className="mt-1 text-on-night-muted">
          <span className="font-semibold text-svc-detail">{b.service_package_name ?? "Express detailing"}</span>
          {[vehicleLabel(b.vehicle), "10410 S Main St"].filter(Boolean).map((part) => ` · ${part}`)}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={lead}>
            <MapPin aria-hidden className="size-4" /> Directions
          </a>
          <Link href="/dashboard/bookings" className={quietAction}>
            View or change
          </Link>
        </div>
      </Shell>
    );
  }

  if (now?.kind === "order_ready" || now?.kind === "order_on_the_way") {
    const ready = now.kind === "order_ready";
    return (
      <Shell id={id}>
        <h2 id={id} className={heading}>
          {ready ? "Your order is ready for pickup" : "Your order is out for delivery"}
        </h2>
        <p className="mt-1 text-on-night-muted">
          {ready ? "Collect it at 10410 S Main St." : "It's on its way to your delivery address."}
        </p>
        <div className="mt-5">
          <Link href="/dashboard/orders" className={quietAction}>
            View order <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </Shell>
    );
  }

  if (isNewCustomer && !isMember) return <Welcome onBook={onBook} />;

  return (
    <Shell id={id}>
      <h2 id={id} className="text-2xl font-black tracking-tight sm:text-3xl">
        {isMember ? "Ready for your next detail?" : "Book your next express detail"}
      </h2>
      <p className="mt-1 text-on-night-muted">Nothing booked yet. Detailing runs Thursday to Sunday.</p>
      <div className="mt-5">
        <button type="button" onClick={onBook} className={lead}>
          Book a detail <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </Shell>
  );
}

function Shell({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-dusk p-5 text-on-night ring-1 ring-white/10 sm:p-7">
      {children}
    </section>
  );
}

const SERVICES = [
  {
    name: "Self-service bays",
    line: "Open 24/7. Tap to pay or use dollar coins.",
    href: "/self-service",
    image: "/self-service.png",
    tone: "text-svc-self",
  },
  {
    name: "Express detailing",
    line: "Interior deep clean, wax and polish, by appointment.",
    href: "/services",
    image: "/professional-express-car-detailing.png",
    tone: "text-svc-detail",
  },
  {
    name: "Unlimited membership",
    line: "Any vehicle, one price. No contract, cancel anytime.",
    href: "/dashboard/pricing",
    image: "/express-detailing-subscription.png",
    tone: "text-svc-member",
  },
] as const;

function Welcome({ onBook }: { onBook: () => void }) {
  return (
    <section aria-labelledby="welcome-heading" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10 sm:p-7">
      <h2 id="welcome-heading" className={heading}>
        Three ways to a clean car, one location
      </h2>
      <p className="mt-2 max-w-prose text-on-night-muted">
        Wash it yourself, have us detail it, or go unlimited. All at 10410 S Main St.
      </p>
      <ul className="mt-6 space-y-3">
        {SERVICES.map((s) => (
          <li key={s.name}>
            <Link
              href={s.href}
              className="group flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-flame"
            >
              <Image src={s.image} alt="" width={96} height={72} className="h-18 w-24 shrink-0 rounded-lg object-cover" />
              <span className="min-w-0">
                <span className={cn("block font-bold", s.tone)}>{s.name}</span>
                <span className="block text-sm text-on-night-muted">{s.line}</span>
              </span>
              <ArrowRight
                aria-hidden
                className="ml-auto size-4 shrink-0 text-on-night-subtle transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBook} className={cn(primaryAction, "mt-6")}>
        Book your first detail <ArrowRight aria-hidden className="size-4" />
      </button>
    </section>
  );
}
