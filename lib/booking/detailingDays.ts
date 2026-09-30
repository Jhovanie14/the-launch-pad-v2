// Detailing runs Thursday–Sunday only. Customers booking online cannot pick
// Monday–Wednesday; admins booking from the dashboard are exempt so staff can
// still schedule an exception by hand.

/** JS weekday numbers (Sunday = 0) on which detailing is closed. */
export const DETAILING_CLOSED_WEEKDAYS = [1, 2, 3] as const;

export const DETAILING_CLOSED_MESSAGE =
  "Detailing is closed Monday through Wednesday. Please choose a Thursday–Sunday date.";

/**
 * Weekday of a "YYYY-MM-DD" calendar date. Read in UTC so the answer does not
 * depend on the server's or browser's timezone — the string already names the
 * shop-local day. Returns null for anything that is not a real date.
 */
function weekdayOf(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return utc.getUTCDay();
}

/** True when detailing is open on the given "YYYY-MM-DD" date. */
export function isDetailingOpenOn(date: string): boolean {
  const weekday = weekdayOf(date);
  if (weekday === null) return false;
  return !(DETAILING_CLOSED_WEEKDAYS as readonly number[]).includes(weekday);
}
