// Promo rules shared by the booking screens (display) and validatePromo (the
// charge). Kept free of server imports so client components can use them too.

/** One-time bookings accept "one_time" and "both" codes, never "subscription". */
export function promoAppliesToOneTime(appliesTo: string | null | undefined): boolean {
  return appliesTo === "one_time" || appliesTo === "both";
}

/**
 * restricted_to_service holds free text typed on the admin Promo page (saved
 * lowercase, e.g. "classic complete"). It matches a service whose name or
 * category contains that text.
 */
export function promoMatchesService(
  restriction: string | null | undefined,
  service: { name?: string | null; category?: string | null } | null
): boolean {
  const r = restriction?.trim().toLowerCase();
  if (!r) return true;
  if (!service) return false;
  return (
    (service.name ?? "").toLowerCase().includes(r) ||
    (service.category ?? "").toLowerCase().includes(r)
  );
}
