// The one rule for which appointment a CUSTOMER may book online. The date
// picker and the time list use the same constants, but the server checks this
// on every booking path because anything the browser sends can be edited.
// Admin bookings from the dashboard do not use it, so staff can still book an
// exception by hand.

import { BUSINESS_TIME_ZONE, addDays, houstonToday } from "@/lib/admin/bookingQuery";
import { DETAILING_CLOSED_MESSAGE, isDetailingOpenOn } from "./detailingDays";

/**
 * Start times offered online. Detailing is open 9:30 AM – 6:30 PM and a
 * service takes up to an hour, so the last start is 5:30 PM.
 */
export const BOOKING_TIME_SLOTS = [
  "9:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
] as const;

/** How far ahead a customer can book. */
export const BOOKING_MAX_DAYS_AHEAD = 180;

/** "9:30" / "09:30" -> minutes after midnight, or null when it is not a time. */
function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

const SLOT_MINUTES = new Set(BOOKING_TIME_SLOTS.map((s) => minutesOf(s)!));

/** Minutes after midnight right now in Houston. */
function houstonMinutesNow(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** True when this slot has already started (or passed) on Houston's today. */
export function isSlotPast(date: string, time: string, now: Date = new Date()): boolean {
  const minutes = minutesOf(time);
  if (minutes === null) return true;
  const today = houstonToday(now);
  if (date < today) return true;
  return date === today && minutes <= houstonMinutesNow(now);
}

/**
 * Why this appointment cannot be booked online, or null when it can.
 * `date` is "YYYY-MM-DD" and `time` is "H:MM" (24-hour), as the booking pages send them.
 */
export function validateAppointment(date: string, time: string, now: Date = new Date()): string | null {
  if (!isDetailingOpenOn(date)) return DETAILING_CLOSED_MESSAGE;

  const today = houstonToday(now);
  if (date < today) return "That date has passed. Please choose another date.";
  if (date > addDays(today, BOOKING_MAX_DAYS_AHEAD)) {
    return `Bookings can be made up to ${BOOKING_MAX_DAYS_AHEAD} days ahead. Please choose an earlier date.`;
  }

  const minutes = minutesOf(time ?? "");
  if (minutes === null || !SLOT_MINUTES.has(minutes)) {
    return "Please choose one of the available times.";
  }
  if (isSlotPast(date, time, now)) return "That time has passed. Please choose a later time.";
  return null;
}
