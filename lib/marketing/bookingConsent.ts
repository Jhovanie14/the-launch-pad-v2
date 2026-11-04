/**
 * Guest bookings pay by card, so the booking row is only written by the Stripe
 * webhook. The guest's marketing tick rides along in the checkout session's
 * booking metadata as `mk: 1` (only set for guests who ticked the box) and is
 * recorded after the booking is saved. A missing `mk` means "no change",
 * never "unsubscribe". Signed-in customers use Dashboard -> Settings instead.
 */
export function bookingMetaOptsIn(
  meta: { uid: string | null; em: string; mk?: number } | null,
): boolean {
  if (!meta) return false;
  return meta.mk === 1 && !meta.uid && !!meta.em?.trim();
}
