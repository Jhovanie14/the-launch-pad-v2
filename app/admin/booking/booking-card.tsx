"use client";

import type { KeyboardEvent, MouseEvent } from "react";
import { Banknote, CreditCard, Loader2, Repeat, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  QUEUE_STATUS_LABEL,
  dayLabel,
  formatTime12,
  isNewBooking,
  queueStatus,
  shortName,
  shortRef,
  tookLabel,
  type QueueStatus,
} from "@/lib/admin/bookingQueue";
import type { Booking } from "@/types";

/** Status dot colours, shared with the calendar. */
export const STATUS_DOT: Record<QueueStatus, string> = {
  waiting: "bg-amber-500",
  in_progress: "bg-blue-500",
  done: "bg-green-600",
  cancelled: "bg-slate-400",
};

const STATUS_BADGE: Record<QueueStatus, string> = {
  waiting: "bg-amber-50 text-amber-900 border-amber-200",
  in_progress: "bg-blue-50 text-blue-900 border-blue-200",
  done: "bg-green-50 text-green-900 border-green-200",
  cancelled: "bg-slate-50 text-slate-600 border-slate-200",
};

const PAYMENT_ICON: Record<string, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  subscription: Repeat,
};

export function vehicleLine(booking: Booking): string | null {
  const v = booking.vehicle;
  if (!v) return null;
  const car = [v.year, v.make, v.model].filter(Boolean).join(" ");
  return [car, v.colors, v.body_type].filter(Boolean).join(" · ") || null;
}

export function serviceLine(booking: Booking): string {
  const names = [booking.service_package_name, ...(booking.add_ons ?? []).map((a) => a?.name)].filter(Boolean);
  return names.join(" + ") || "No service on file";
}

export function hasNotes(booking: Booking): boolean {
  return Boolean(booking.notes?.trim() || booking.special_instructions?.trim());
}

type Props = {
  booking: Booking;
  isMember: boolean;
  isNext: boolean;
  now: Date;
  showDate?: boolean;
  busy: boolean;
  onAdvance: (b: Booking, next: "confirmed" | "completed") => void;
  onOpen: (b: Booking) => void;
};

export function BookingCard({ booking, isMember, isNext, now, showDate, busy, onAdvance, onOpen }: Props) {
  const status = queueStatus(booking.status);
  const took = status === "done" ? tookLabel(booking.confirmed_at, booking.completed_at) : null;
  const car = vehicleLine(booking);
  const plate = booking.vehicle?.license_plate?.trim();
  const PaymentIcon = PAYMENT_ICON[booking.payment_method];

  const open = () => onOpen(booking);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  const advance = (e: MouseEvent<HTMLButtonElement>, next: "confirmed" | "completed") => {
    e.stopPropagation();
    onAdvance(booking, next);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={onKeyDown}
      aria-label={`${formatTime12(booking.appointment_time)}, ${shortName(booking.customer_name)}, ${QUEUE_STATUS_LABEL[status]}. Open details`}
      className={cn(
        "rounded-lg border bg-card p-3 text-left shadow-xs transition-colors hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40 cursor-pointer",
        isNext && "ring-2 ring-blue-900 border-transparent",
        status === "cancelled" && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {showDate && (
            <p className="text-xs font-medium text-muted-foreground">{dayLabel(booking.appointment_date)}</p>
          )}
          <p className="text-lg font-semibold leading-tight tabular-nums">
            {formatTime12(booking.appointment_time)}
            <span className="ml-1.5 text-sm font-normal text-muted-foreground">· {booking.total_duration} min</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
              STATUS_BADGE[status],
            )}
          >
            <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
            {QUEUE_STATUS_LABEL[status]}
          </span>
          {took && <span className="text-xs text-muted-foreground">took {took}</span>}
          {isNext && <span className="text-xs font-medium text-blue-900">Next up</span>}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-medium">{shortName(booking.customer_name)}</span>
        <span className="font-mono text-xs text-muted-foreground">Ref {shortRef(booking.id)}</span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {plate && (
          <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide">
            {plate}
          </span>
        )}
        <span className="text-muted-foreground">{car ?? (plate ? "" : "No vehicle on file")}</span>
      </div>

      <p className="mt-1 text-sm">{serviceLine(booking)}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        {isMember && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 font-medium text-purple-900">Member</span>
        )}
        {booking.payment_method && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 capitalize text-slate-700">
            {PaymentIcon && <PaymentIcon className="size-3" aria-hidden />}
            {booking.payment_method}
          </span>
        )}
        {isNewBooking(booking.created_at, now) && (
          <span className="rounded-full bg-blue-900 px-2 py-0.5 font-medium text-white">New</span>
        )}
        {hasNotes(booking) && (
          <span className="inline-flex items-center text-amber-700" aria-label="Has notes" title="Has notes">
            <StickyNote className="size-4" aria-hidden />
          </span>
        )}
      </div>

      {status === "waiting" && (
        <Button
          className="mt-3 min-h-12 w-full bg-blue-900 text-base font-semibold hover:bg-blue-800"
          disabled={busy}
          onClick={(e) => advance(e, "confirmed")}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Start
        </Button>
      )}
      {status === "in_progress" && (
        <Button
          className="mt-3 min-h-12 w-full bg-green-700 text-base font-semibold hover:bg-green-800"
          disabled={busy}
          onClick={(e) => advance(e, "completed")}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Complete
        </Button>
      )}
    </div>
  );
}
