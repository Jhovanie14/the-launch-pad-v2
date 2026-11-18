/**
 * "2026-11-08" → "Sun, Nov 8, 2026". The value is a calendar date, so it is
 * read and printed in UTC: it never shifts a day with the server's or the
 * browser's timezone. Safe to use in client components (no other imports).
 */
export function formatCalendarDate(value: string): string {
  const day = String(value ?? "").slice(0, 10);
  const date = new Date(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) return String(value ?? "");
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
