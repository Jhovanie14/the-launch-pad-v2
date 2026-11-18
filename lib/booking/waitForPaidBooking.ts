import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The booking the Stripe webhook creates for a card payment. The customer is
 * sent back to the success page by Stripe, and that can arrive before the
 * webhook has saved the booking, so this looks a few times (about 5 seconds
 * in all) before giving up. The success page used to look once and show an
 * error page to a customer who had just paid.
 */
export async function waitForPaidBooking(
  db: SupabaseClient,
  paymentIntentId: string | null | undefined,
  opts: { attempts?: number; delayMs?: number } = {}
): Promise<{ id: string } | null> {
  if (!paymentIntentId) return null;
  const attempts = opts.attempts ?? 8;
  const delayMs = opts.delayMs ?? 600;
  for (let i = 0; i < attempts; i++) {
    const { data } = await db
      .from("bookings")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .limit(1)
      .maybeSingle();
    if (data) return data as { id: string };
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}
