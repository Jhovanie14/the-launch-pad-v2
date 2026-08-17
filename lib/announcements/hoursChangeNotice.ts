/**
 * One-off customer announcement: detailing moves to Thursday–Sunday hours.
 *
 * The decision of whether to show it is kept pure so it can be tested under the
 * repo's node-env vitest setup; the component owns the localStorage access.
 */

/** Date the new schedule takes effect, as written to customers. */
export const HOURS_NOTICE_EFFECTIVE_LABEL = "September 18";

/**
 * After this moment the notice stops appearing on its own. Without it a
 * visitor who never dismissed the dialog would still be told about a schedule
 * change that took effect weeks ago.
 */
export const HOURS_NOTICE_RETIRE_AT = new Date("2026-10-01T00:00:00Z");

/**
 * Separate key per surface, on purpose: dismissing the informational popup as
 * a logged-out visitor should not suppress the actionable version a plan
 * holder sees in their dashboard. Keys carry the effective date so a future
 * announcement is a new key rather than a silently-already-dismissed one.
 */
export const HOURS_NOTICE_KEYS = {
  landing: "hoursChangeNotice:landing:2026-09-18",
  dashboard: "hoursChangeNotice:dashboard:2026-09-18",
} as const;

export type HoursNoticeSurface = keyof typeof HOURS_NOTICE_KEYS;

export function shouldShowHoursNotice({
  dismissed,
  now,
}: {
  dismissed: boolean;
  now: Date;
}): boolean {
  if (dismissed) return false;
  return now.getTime() < HOURS_NOTICE_RETIRE_AT.getTime();
}
