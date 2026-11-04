"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Package, Timer } from "lucide-react";
import {
  formatAppointment,
  formatClock,
  vehicleLabel,
  type NowItem,
} from "@/lib/dashboard/home";

const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";

const primaryAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 font-bold text-amber-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300";
const quietAction =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400";

/**
 * The one most time-sensitive thing: a bay session in progress, the next
 * detail, an order to collect. With nothing pending it becomes the booking
 * prompt, or for a brand-new customer an introduction to the three services.
 */
export function NowCard({
  now,
  isMember,
  isNewCustomer,
  onBook,
}: {
  now: NowItem | null;
  isMember: boolean;
  isNewCustomer: boolean;
  onBook: () => void;
}) {
  if (now?.kind === "checked_in") {
    return (
      <Shell label="Right now">
        <p className="flex items-center gap-2 text-sm font-semibold text-sky-300">
          <Timer aria-hidden className="size-4" /> Self-service bay
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          You&apos;re checked in since {formatClock(now.log.check_in_time)}
        </p>
        {now.log.vehicle && <p className="mt-1 text-slate-300">{vehicleLabel(now.log.vehicle)}</p>}
      </Shell>
    );
  }

  if (now?.kind === "upcoming" && now.booking.appointment_date) {
    const b = now.booking;
    const date = now.booking.appointment_date;
    return (
      <Shell label="Your next detail">
        <p className="text-sm font-semibold text-amber-300">{b.service_package_name ?? "Express detailing"}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-balance sm:text-4xl">
          {formatAppointment(date, b.appointment_time)
            .split(" · ")
            .map((part, i) => (
              <span key={part} className="whitespace-nowrap">
                {i > 0 && " · "}
                {part}
              </span>
            ))}
        </p>
        <p className="mt-1 text-slate-300">
          {[vehicleLabel(b.vehicle), "10410 S Main St"].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={primaryAction}>
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
      <Shell label="Your order">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          <Package aria-hidden className="size-4" /> Product order
        </p>
        <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
          {ready ? "Ready for pickup" : "Out for delivery"}
        </p>
        <p className="mt-1 text-slate-300">
          {ready ? "Collect it at 10410 S Main St." : "It's on its way to you today."}
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
    <Shell label="Nothing booked">
      <p className="text-2xl font-black tracking-tight sm:text-3xl">
        {isMember ? "Ready for your next detail?" : "Book your next express detail"}
      </p>
      <p className="mt-1 text-slate-300">Pick a time online. Detailing runs Thursday to Sunday.</p>
      <div className="mt-5">
        <button type="button" onClick={onBook} className={primaryAction}>
          Book a detail <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
    </Shell>
  );
}

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={label}
      className="rounded-2xl bg-slate-900 p-5 text-white ring-1 ring-white/10 sm:p-7"
    >
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
    tone: "text-sky-300",
  },
  {
    name: "Express detailing",
    line: "Interior deep clean, wax and polish, by appointment.",
    href: "/services",
    image: "/professional-express-car-detailing.png",
    tone: "text-amber-300",
  },
  {
    name: "Unlimited membership",
    line: "Any vehicle, one price. No contract, cancel anytime.",
    href: "/dashboard/pricing",
    image: "/express-detailing-subscription.png",
    tone: "text-violet-300",
  },
] as const;

function Welcome({ onBook }: { onBook: () => void }) {
  return (
    <section aria-labelledby="welcome-heading" className="rounded-2xl bg-slate-950 p-5 text-white ring-1 ring-white/10 sm:p-7">
      <h2 id="welcome-heading" className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
        Three ways to a clean car, one location
      </h2>
      <p className="mt-2 max-w-prose text-slate-300">
        Wash it yourself, have us detail it, or go unlimited. All at 10410 S Main St.
      </p>
      <ul className="mt-6 space-y-3">
        {SERVICES.map((s) => (
          <li key={s.name}>
            <Link
              href={s.href}
              className="group flex items-center gap-4 rounded-xl p-2 transition-colors hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Image
                src={s.image}
                alt=""
                width={96}
                height={72}
                className="h-18 w-24 shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0">
                <span className={`block font-bold ${s.tone}`}>{s.name}</span>
                <span className="block text-sm text-slate-300">{s.line}</span>
              </span>
              <ArrowRight aria-hidden className="ml-auto size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBook} className={`${primaryAction} mt-6`}>
        Book your first detail <ArrowRight aria-hidden className="size-4" />
      </button>
    </section>
  );
}
