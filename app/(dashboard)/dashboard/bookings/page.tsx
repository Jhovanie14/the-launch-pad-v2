"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarX2,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Sparkles,
  Star,
  Timer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useBookingRealtime } from "@/hooks/useBookingRealtime";
import { ReviewForm } from "@/components/user/review-form";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
import { useBookingDetails } from "@/hooks/useBookingDetails";
import { Pagination } from "@/components/ui/pagination";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import { DIRECTIONS_URL } from "@/components/dashboard-home/now-card";
import { formatAppointment, rebookHref, vehicleLabel } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";

// Focus outline that stays visible (3:1+) on white.
const LIGHT_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas",
  LIGHT_FOCUS,
);
const PRIMARY_ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** Status reads as words plus an icon; colour never carries it alone. */
const STATUS: Record<Booking["status"], { label: string; icon: LucideIcon }> = {
  pending: { label: "Waiting for confirmation", icon: Clock },
  confirmed: { label: "Confirmed", icon: CheckCircle2 },
  in_progress: { label: "In progress", icon: Timer },
  completed: { label: "Completed", icon: Check },
  cancelled: { label: "Cancelled", icon: XCircle },
};

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `$${n.toFixed(2)}`;
}

function paymentLabel(method: string | null | undefined): string {
  switch (method) {
    case "card":
      return "Paid by card";
    case "cash":
      return "Pay at the site";
    case "subscription":
      return "Membership";
    default:
      return method ? method.charAt(0).toUpperCase() + method.slice(1) : "";
  }
}

function colorsLabel(colors: unknown): string {
  if (Array.isArray(colors)) return colors.filter(Boolean).join(", ");
  return typeof colors === "string" ? colors : "";
}

export default function BookingsList() {
  const { user, isLoading: authLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const {
    bookings,
    loading,
    error,
    reviewedBookings,
    setReviewedBookings,
    setBookings,
    checkReviews,
    loadBookings,
    totalBookings,
    pageSize,
  } = useBookingDetails();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (user) loadBookings(currentPage, user.id);
  }, [currentPage, user, loadBookings]);
  // Realtime channel (only this user's bookings)
  useBookingRealtime(setBookings);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Your bookings</h1>
      <p className="mt-1 text-ink-muted">
        Express detailing appointments at 10410 S Main St.
      </p>

      <div className="mt-6">
        {authLoading || loading ? (
          <BookingsSkeleton />
        ) : error ? (
          <div
            role="alert"
            className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
          >
            <p className="flex items-center gap-2 font-semibold text-ink">
              <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
              We couldn&apos;t load your bookings.
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => user && loadBookings(currentPage, user.id)}
              className={cn(ROW_ACTION, "mt-4")}
            >
              <RotateCcw aria-hidden className="size-4" /> Try again
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
            <CalendarX2 aria-hidden className="size-8 text-ink-subtle" />
            <h2 className="mt-3 text-xl font-black tracking-tight text-ink">
              No bookings yet
            </h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              Book an express detail and it will show up here, with the time,
              your vehicle and what you paid.
            </p>
            <button
              type="button"
              onClick={openBookingModal}
              className={cn(PRIMARY_ACTION, "mt-5")}
            >
              Book a detail <ArrowRight aria-hidden className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <ul className="grid gap-6 lg:grid-cols-2">
              {bookings.map((booking) => (
                <li key={booking.id}>
                  <BookingCard
                    booking={booking}
                    reviewed={!!reviewedBookings[booking.id]}
                    onReview={() => setSelectedBookingId(booking.id)}
                  />
                </li>
              ))}
            </ul>
            {totalBookings > pageSize && (
              <Pagination
                page={currentPage}
                total={totalBookings}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}
          </>
        )}
      </div>

      {/* Review dialog */}
      {user && selectedBookingId && (
        <ReviewForm
          bookingId={selectedBookingId}
          userId={user.id}
          open={!!selectedBookingId}
          onOpenChange={() => setSelectedBookingId(null)}
          onSubmitted={async () => {
            setSelectedBookingId(null);

            setReviewedBookings((prev) => ({
              ...prev,
              [selectedBookingId!]: true,
            }));

            await checkReviews();
          }}
        />
      )}
    </div>
  );
}

function BookingCard({
  booking,
  reviewed,
  onReview,
}: {
  booking: Booking;
  reviewed: boolean;
  onReview: () => void;
}) {
  const status = STATUS[booking.status] ?? { label: booking.status, icon: Clock };
  const StatusIcon = status.icon;
  const serviceName = booking.service_package_name ?? "Express detailing";
  const when = booking.appointment_date
    ? formatAppointment(booking.appointment_date, booking.appointment_time)
    : null;
  const car = vehicleLabel(booking.vehicle);
  const carDetail = [booking.vehicle?.body_type, colorsLabel(booking.vehicle?.colors)]
    .filter(Boolean)
    .join(" · ");
  const packagePrice = Number(booking.service_package_price ?? 0);
  const upcoming = booking.status === "pending" || booking.status === "confirmed";
  const cancelled = booking.status === "cancelled";

  return (
    <article
      aria-labelledby={`booking-${booking.id}`}
      className="flex h-full flex-col rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h2 id={`booking-${booking.id}`} className="min-w-0">
          <span className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
            <Sparkles aria-hidden className="size-5 shrink-0 text-svc-detail-mark" />
            <span className={cn(cancelled && "line-through decoration-ink-subtle")}>
              {serviceName}
            </span>
          </span>
          {when && (
            <span className="mt-1 block font-semibold text-ink">
              {when.split(" · ").map((part, i) => (
                <span key={part} className="whitespace-nowrap">
                  {i > 0 && " · "}
                  {part}
                </span>
              ))}
            </span>
          )}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas px-2.5 py-1 text-sm font-semibold text-ink-muted ring-1 ring-line">
          <StatusIcon aria-hidden className="size-4" />
          {status.label}
        </span>
      </div>

      {(car || booking.vehicle?.license_plate) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          {car && <span className="font-medium text-ink">{car}</span>}
          {booking.vehicle?.license_plate && (
            <LicensePlate plate={booking.vehicle.license_plate} />
          )}
          {carDetail && (
            <span className="w-full text-sm text-ink-muted">{carDetail}</span>
          )}
        </div>
      )}

      <dl className="mt-4 divide-y divide-line-soft border-t border-line-soft text-sm">
        <div className="flex justify-between gap-4 py-2">
          <dt className="text-ink-muted">{serviceName}</dt>
          <dd className="font-medium tabular-nums text-ink">
            {packagePrice === 0 ? "Free" : money(packagePrice)}
          </dd>
        </div>
        {booking.add_ons?.map((addon) => (
          <div key={addon.id} className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">{addon.name}</dt>
            <dd className="font-medium tabular-nums text-ink">+{money(addon.price)}</dd>
          </div>
        ))}
        {booking.total_duration > 0 && (
          <div className="flex justify-between gap-4 py-2">
            <dt className="text-ink-muted">Time at the site</dt>
            <dd className="font-medium text-ink">About {booking.total_duration} min</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 py-2">
          <dt className="font-semibold text-ink">
            Total
            {booking.payment_method && (
              <span className="ml-2 font-normal text-ink-muted">
                {paymentLabel(booking.payment_method)}
              </span>
            )}
          </dt>
          <dd className="text-base font-black tabular-nums text-ink">
            {money(booking.total_price)}
          </dd>
        </div>
      </dl>

      <div className="flex-1" />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {booking.status === "completed" && !reviewed && (
          <button type="button" onClick={onReview} className={ROW_ACTION}>
            <Star aria-hidden className="size-4" /> How was it?
          </button>
        )}
        {booking.status === "completed" && reviewed && (
          <span className="inline-flex min-h-11 items-center gap-1.5 px-1 text-sm font-semibold text-ink-muted">
            <Check aria-hidden className="size-4" /> Thanks for your review
          </span>
        )}
        {(booking.status === "completed" || cancelled) && (
          <Link href={rebookHref(booking)} className={ROW_ACTION}>
            <RotateCcw aria-hidden className="size-4" /> Book again
          </Link>
        )}
        {upcoming && (
          <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={ROW_ACTION}>
            <MapPin aria-hidden className="size-4" /> Directions
          </a>
        )}
        <span className="ml-auto text-xs text-ink-subtle">
          Ref {booking.id.slice(0, 8).toUpperCase()}
        </span>
      </div>
    </article>
  );
}

function BookingsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your bookings" className="grid gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-72 animate-pulse rounded-2xl bg-line motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
