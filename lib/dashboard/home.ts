import { buildBookingSearch } from "@/lib/booking/bookingParams";

/**
 * Pure logic behind the customer dashboard home: what goes in the "Now"
 * slot, the merged visit history, and the display strings. Everything the
 * customer reads is in the business's time zone (Houston), so a date never
 * shifts by a day depending on the device or the server.
 */

export const BUSINESS_TIME_ZONE = "America/Chicago";

export interface HomeVehicle {
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  license_plate?: string | null;
}

export interface HomeBooking {
  id: string;
  status: string;
  appointment_date: string | null; // "YYYY-MM-DD"
  appointment_time: string | null; // "HH:MM[:SS]"
  service_package_id: string | null;
  service_package_name: string | null;
  vehicle_id: string | null;
  completed_at: string | null;
  created_at: string;
  vehicle?: HomeVehicle | null;
}

export interface HomeUsageLog {
  id: string;
  check_in_time: string;
  check_out_time?: string | null;
  status: string;
  vehicle?: HomeVehicle | null;
}

export interface HomeOrder {
  id: string;
  status: string;
  fulfillment_method: "pickup" | "delivery" | string;
  total: number | string;
  created_at: string;
}

export type NowItem =
  | { kind: "checked_in"; log: HomeUsageLog }
  | { kind: "upcoming"; booking: HomeBooking }
  | { kind: "order_ready"; order: HomeOrder }
  | { kind: "order_on_the_way"; order: HomeOrder };

export interface VisitItem {
  id: string;
  kind: "detail" | "self_service" | "order";
  at: string; // ISO instant used for ordering and the date label
  title: string;
  detail: string;
  booking?: HomeBooking; // for "Book this again" / reviews
}

const UPCOMING_STATUSES = new Set(["pending", "confirmed", "in_progress"]);

function parseTime(time: string | null): { h: number; m: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null;
}

/** "Sun, Nov 8 · 10:30 AM" from a bare appointment date and time. */
export function formatAppointment(date: string, time: string | null): string {
  const [y, mo, d] = date.split("-").map(Number);
  const t = parseTime(time);
  // Treat the wall-clock values as UTC and format in UTC: no zone can shift them.
  const instant = new Date(Date.UTC(y, mo - 1, d, t?.h ?? 12, t?.m ?? 0));
  const day = instant.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (!t) return day;
  const clock = instant.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
  return `${day} · ${clock}`;
}

/** "Nov 2" for an ISO instant, in the business time zone. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

/** "2:14 PM" for an ISO instant, in the business time zone. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export function vehicleLabel(v: HomeVehicle | null | undefined): string {
  if (!v) return "";
  return [v.year, v.make, v.model].filter((part) => part !== null && part !== undefined && part !== "").join(" ");
}

export function membershipStatusLine(sub: {
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}): string {
  if (!sub.current_period_end) return "Active";
  const date = new Date(sub.current_period_end).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
  return sub.cancel_at_period_end ? `Ends ${date}` : `Active through ${date}`;
}

/** Today's date and minutes-since-midnight in the business time zone. */
function businessToday(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function isUpcoming(b: HomeBooking, now: Date): boolean {
  if (!UPCOMING_STATUSES.has(b.status) || !b.appointment_date) return false;
  const today = businessToday(now);
  if (b.appointment_date > today.date) return true;
  if (b.appointment_date < today.date) return false;
  const t = parseTime(b.appointment_time);
  return !t || t.h * 60 + t.m >= today.minutes;
}

function appointmentSortKey(b: HomeBooking): string {
  return `${b.appointment_date ?? ""} ${(b.appointment_time ?? "").padStart(8, "0")}`;
}

/** What belongs in the "Now" slot, most time-sensitive first; null if nothing. */
export function pickNow(input: {
  bookings: HomeBooking[];
  logs: HomeUsageLog[];
  orders: HomeOrder[];
  now: Date;
}): NowItem | null {
  const checkedIn = input.logs.find((l) => !l.check_out_time && l.status === "in_progress");
  if (checkedIn) return { kind: "checked_in", log: checkedIn };

  const upcoming = input.bookings
    .filter((b) => isUpcoming(b, input.now))
    .sort((a, b) => appointmentSortKey(a).localeCompare(appointmentSortKey(b)));
  if (upcoming[0]) return { kind: "upcoming", booking: upcoming[0] };

  const ready = input.orders.find((o) => o.status === "ready_for_pickup");
  if (ready) return { kind: "order_ready", order: ready };
  const onTheWay = input.orders.find((o) => o.status === "out_for_delivery");
  if (onTheWay) return { kind: "order_on_the_way", order: onTheWay };

  return null;
}

/** All upcoming bookings, soonest first (the Now slot shows the first). */
export function upcomingBookings(bookings: HomeBooking[], now: Date): HomeBooking[] {
  return bookings
    .filter((b) => isUpcoming(b, now))
    .sort((a, b) => appointmentSortKey(a).localeCompare(appointmentSortKey(b)));
}

function minutesBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

/** Finished details, bay visits and orders in one list, newest first. */
export function buildPastVisits(
  input: { bookings: HomeBooking[]; logs: HomeUsageLog[]; orders: HomeOrder[] },
  limit = 6,
): VisitItem[] {
  const details: VisitItem[] = input.bookings
    .filter((b) => b.status === "completed")
    .map((b) => ({
      id: b.id,
      kind: "detail" as const,
      at: b.completed_at ?? `${b.appointment_date ?? b.created_at.slice(0, 10)}T18:00:00Z`,
      title: b.service_package_name ?? "Express detailing",
      detail: vehicleLabel(b.vehicle),
      booking: b,
    }));

  const bay: VisitItem[] = input.logs
    .filter((l) => !!l.check_out_time)
    .map((l) => ({
      id: l.id,
      kind: "self_service" as const,
      at: l.check_in_time,
      title: "Self-service bay",
      detail: `${minutesBetween(l.check_in_time, l.check_out_time!)} min`,
    }));

  const orders: VisitItem[] = input.orders
    .filter((o) => o.status === "completed")
    .map((o) => ({
      id: o.id,
      kind: "order" as const,
      at: o.created_at,
      title: "Product order",
      detail: o.fulfillment_method === "delivery" ? "Delivered" : "Picked up",
    }));

  return [...details, ...bay, ...orders]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/** "Book this again": skip straight to date and time with the same service and car. */
export function rebookHref(b: HomeBooking): string {
  if (!b.service_package_id) return "/dashboard/booking/service";
  const search = buildBookingSearch({
    licensePlate: "",
    vehicleId: b.vehicle_id ?? "",
    serviceId: b.service_package_id,
    addOnIds: [],
    date: null,
    time: null,
  });
  return `/dashboard/booking/datetime?${search}`;
}
