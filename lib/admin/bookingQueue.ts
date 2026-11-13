import type { Booking } from "@/types";
import { addDays } from "./bookingQuery";

/** The attendant's view of a booking's status. */
export type QueueStatus = "waiting" | "in_progress" | "done" | "cancelled";

export function queueStatus(status: Booking["status"]): QueueStatus {
  switch (status) {
    case "pending":
      return "waiting";
    case "confirmed":
    case "in_progress":
      return "in_progress";
    case "completed":
      return "done";
    default:
      return "cancelled";
  }
}

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Waiting",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

function nameWords(full: string | null | undefined): string[] {
  return (full ?? "").trim().split(/\s+/).filter(Boolean);
}

/** "James Carter" → "James C."; blank → "Guest". */
export function shortName(full: string | null | undefined): string {
  const words = nameWords(full);
  if (words.length === 0) return "Guest";
  if (words.length === 1) return words[0];
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
}

export function firstName(full: string | null | undefined): string {
  return nameWords(full)[0] ?? "Guest";
}

/** The 8-character reference customers see in emails and their dashboard. */
export function shortRef(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

function refTerm(term: string): string {
  return term.trim().replace(/^#/, "").toLowerCase();
}

export function isShortRefTerm(term: string): boolean {
  return /^[0-9a-f]{8}$/.test(refTerm(term));
}

export function matchesShortRef(id: string, term: string): boolean {
  return isShortRefTerm(term) && id.toLowerCase().startsWith(refTerm(term));
}

/** Minutes after midnight; unreadable times sort last. Accepts "14:30:00" and legacy "10:10 PM". */
export function timeMinutes(time: string | null | undefined): number {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(time ?? "");
  if (!m) return Number.MAX_SAFE_INTEGER;
  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3]?.toUpperCase();
  if (meridiem) {
    if (hours < 1 || hours > 12) return Number.MAX_SAFE_INTEGER;
    hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
  }
  if (hours > 23 || minutes > 59) return Number.MAX_SAFE_INTEGER;
  return hours * 60 + minutes;
}

export function formatTime12(time: string | null | undefined): string {
  const total = timeMinutes(time);
  if (total === Number.MAX_SAFE_INTEGER) return time?.trim() || "—";
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

/** How long a finished wash took, from Start to Complete. */
export function tookLabel(confirmedAt: string | null, completedAt: string | null): string | null {
  if (!confirmedAt || !completedAt) return null;
  const diffSec = (new Date(completedAt).getTime() - new Date(confirmedAt).getTime()) / 1000;
  if (!Number.isFinite(diffSec) || diffSec < 0) return null;
  if (diffSec < 60) return `${diffSec.toFixed(0)} sec`;
  const diffMin = diffSec / 60;
  if (diffMin < 60) return `${diffMin.toFixed(0)} min`;
  return `${(diffMin / 60).toFixed(0)} hr`;
}

const NEW_FOR_MS = 10 * 60 * 1000;

/** "New" = the booking was made in the last 10 minutes. */
export function isNewBooking(createdAt: string | null | undefined, now: Date): boolean {
  if (!createdAt) return false;
  const age = now.getTime() - new Date(createdAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= NEW_FOR_MS;
}

export function dayCounts(rows: Pick<Booking, "status">[]): { waiting: number; inProgress: number; done: number } {
  const counts = { waiting: 0, inProgress: 0, done: 0 };
  for (const row of rows) {
    const s = queueStatus(row.status);
    if (s === "waiting") counts.waiting++;
    else if (s === "in_progress") counts.inProgress++;
    else if (s === "done") counts.done++;
  }
  return counts;
}

/** The earliest waiting booking: the next car to start. */
export function nextWaitingId(rows: Pick<Booking, "id" | "status" | "appointment_time">[]): string | null {
  let best: { id: string; at: number } | null = null;
  for (const row of rows) {
    if (row.status !== "pending") continue;
    const at = timeMinutes(row.appointment_time);
    if (!best || at < best.at) best = { id: row.id, at };
  }
  return best?.id ?? null;
}

/** The light row the month calendar needs. */
export type CalendarEntry = Pick<Booking, "id" | "appointment_date" | "appointment_time" | "status" | "customer_name">;

export const CALENDAR_SELECT = "id, appointment_date, appointment_time, status, customer_name";

/** "2026-11-13" → "2026-11". */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** Monday-first weeks covering the month, as "YYYY-MM-DD" cells. */
export function monthGrid(month: string): string[][] {
  const mondayIndex = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const end = addDays(last, 6 - mondayIndex(last));
  const weeks: string[][] = [];
  for (let cell = addDays(first, -mondayIndex(first)); cell <= end; ) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++, cell = addDays(cell, 1)) week.push(cell);
    weeks.push(week);
  }
  return weeks;
}

/** First and last cell of the month grid, for the calendar query. */
export function monthBounds(month: string): { gte: string; lte: string } {
  const grid = monthGrid(month);
  return { gte: grid[0][0], lte: grid[grid.length - 1][6] };
}

export type Dated = { id: string; appointment_date: string; appointment_time: string };

/** Date first, then time of day. */
export function compareSlots(a: Dated, b: Dated): number {
  if (a.appointment_date !== b.appointment_date) return a.appointment_date < b.appointment_date ? -1 : 1;
  return timeMinutes(a.appointment_time) - timeMinutes(b.appointment_time);
}

/** Apply one live change: drop the old copy, add the new one if it still belongs, keep slot order. */
export function applyBookingChange<T extends Dated>(list: T[], id: string, row: T | null, keep: (row: T) => boolean): T[] {
  const next = list.filter((r) => r.id !== id);
  if (row && keep(row)) next.push(row);
  return next.sort(compareSlots);
}

/** Today and upcoming first (soonest first), then past bookings (most recent first). */
export function sortSearchResults<T extends Dated>(rows: T[], today: string): T[] {
  const upcoming = rows.filter((r) => r.appointment_date >= today).sort(compareSlots);
  const past = rows.filter((r) => r.appointment_date < today).sort((a, b) => compareSlots(b, a));
  return [...upcoming, ...past];
}

/** "2026-11-13" → "Fri, Nov 13" (read as a calendar date, never shifted by time zone). */
export function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** At midnight, an attendant who was looking at "today" moves to the new today. */
export function rollSelectedDay(selected: string, previousToday: string, today: string): string {
  return selected === previousToday ? today : selected;
}

export type PanelChip = "all" | Exclude<QueueStatus, "cancelled">;

/**
 * What the side panel lists: the selected day only (or every date for search
 * results, `day: null`), then "Show cancelled" and the status chip.
 * `hidden` counts the day's rows the status filters hid.
 */
export function filterPanel<T extends Pick<Booking, "status" | "appointment_date">>(
  rows: T[],
  opts: { day: string | null; showCancelled: boolean; chip: PanelChip },
): { rows: T[]; hidden: number } {
  const source = opts.day === null ? rows : rows.filter((r) => r.appointment_date === opts.day);
  const shown = source.filter((r) => {
    const s = queueStatus(r.status);
    if (s === "cancelled") return opts.showCancelled && opts.chip === "all";
    return opts.chip === "all" || opts.chip === s;
  });
  return { rows: shown, hidden: source.length - shown.length };
}

/** Per-booking guard so one booking's action can't run twice at once. */
export function createInFlight() {
  const ids = new Set<string>();
  return {
    start(id: string): boolean {
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    },
    finish(id: string): void {
      ids.delete(id);
    },
  };
}
