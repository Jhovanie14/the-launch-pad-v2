/**
 * Pure helpers for the admin bookings list, so filtering and paging happen
 * in the database instead of downloading every booking to the browser.
 */

export const BUSINESS_TIME_ZONE = "America/Chicago";

export type BookingDateFilter = "all" | "today" | "week" | "month" | "lastWeek" | "lastMonth";

/** Today's calendar date at the business ("YYYY-MM-DD", Houston time). */
export function houstonToday(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar arithmetic on "YYYY-MM-DD" strings (UTC-based, so no DST drift). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * appointment_date bounds for a filter, matching the page's existing meaning:
 * week / month look ahead from today (inclusive); lastWeek / lastMonth look
 * back and exclude today.
 */
export function bookingDateRange(
  filter: BookingDateFilter,
  today: string,
): { gte?: string; lte?: string; lt?: string } {
  switch (filter) {
    case "today":
      return { gte: today, lte: today };
    case "week":
      return { gte: today, lte: addDays(today, 7) };
    case "month":
      return { gte: today, lte: addDays(today, 30) };
    case "lastWeek":
      return { gte: addDays(today, -7), lt: today };
    case "lastMonth":
      return { gte: addDays(today, -30), lt: today };
    default:
      return {};
  }
}

/**
 * Removes characters that are syntax in a PostgREST `or=(…)` filter (commas,
 * parentheses) or wildcards (* % \), so a search can't break or widen the
 * query. Collapses whitespace.
 */
export function cleanSearchTerm(raw: string): string {
  return raw.replace(/[,()*%\\]/g, " ").replace(/\s+/g, " ").trim();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The `or` filter for a search: customer name, email or service contains the
 * term, or the booking's vehicle is one of `vehicleIds` (found separately by
 * plate / make / model), or the term is the booking's full id.
 */
export function bookingSearchOr(rawTerm: string, vehicleIds: string[]): string | null {
  const term = cleanSearchTerm(rawTerm);
  if (!term) return null;
  const parts = [
    `customer_name.ilike.%${term}%`,
    `customer_email.ilike.%${term}%`,
    `service_package_name.ilike.%${term}%`,
  ];
  if (vehicleIds.length) parts.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
  if (UUID.test(term)) parts.push(`id.eq.${term}`);
  return parts.join(",");
}

/** The `or` filter that finds vehicles by plate, make or model. */
export function vehicleSearchOr(rawTerm: string): string | null {
  const term = cleanSearchTerm(rawTerm);
  if (!term) return null;
  return [`license_plate.ilike.%${term}%`, `make.ilike.%${term}%`, `model.ilike.%${term}%`].join(",");
}
