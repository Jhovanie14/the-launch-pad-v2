// Thin wrapper over the GA4 tag loaded in app/layout.tsx.
//
// Everything here is best-effort and silent: analytics must never break a
// checkout. If the tag is blocked, still loading, or absent in development,
// these calls no-op rather than throw.

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
  }
}

/** Send a GA4 event. Safe to call during SSR and before the tag has loaded. */
export function trackEvent(
  name: string,
  params: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    // An analytics failure is not worth surfacing to a customer.
  }
}
