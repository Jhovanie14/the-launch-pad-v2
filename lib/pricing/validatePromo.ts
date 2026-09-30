import type { SupabaseClient } from "@supabase/supabase-js";
import { promoAppliesToOneTime, promoMatchesService } from "./promoRules";

export interface PromoInput {
  code: string;
  baseAmount: number;
  userId: string | null;
  serviceId: string;
}

export interface PromoResult {
  discountedAmount: number;
  promoId: number | null;
}

/**
 * Validate a one-time-booking promo code against the DB and return the
 * discounted amount. Any failure (inactive, wrong type, maxed, restricted,
 * already redeemed, missing) is a silent no-op that returns the original
 * amount — never throws.
 */
export async function validatePromo(
  db: SupabaseClient,
  input: PromoInput
): Promise<PromoResult> {
  const none: PromoResult = { discountedAmount: input.baseAmount, promoId: null };
  const code = input.code?.trim();
  if (!code) return none;

  const { data: promo } = await db
    .from("promo_codes")
    .select(
      "id, discount_type, discount_percent, discount_amount, is_active, applies_to, max_uses, used_count, restricted_to_service"
    )
    .ilike("code", code)
    .maybeSingle();

  if (!promo || !promo.is_active) return none;
  if (!promoAppliesToOneTime(promo.applies_to)) return none;

  if (promo.max_uses != null) {
    // Count redemption rows as well as used_count: nothing in the app
    // increments used_count, so the rows are the reliable tally.
    const { count } = await db
      .from("promo_code_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_code_id", promo.id);
    const uses = Math.max(Number(promo.used_count) || 0, count ?? 0);
    if (uses >= Number(promo.max_uses)) return none;
  }

  if (promo.restricted_to_service) {
    const { data: service } = input.serviceId
      ? await db
          .from("service_packages")
          .select("name, category")
          .eq("id", input.serviceId)
          .maybeSingle()
      : { data: null };
    if (!promoMatchesService(promo.restricted_to_service, service)) return none;
  }

  if (input.userId) {
    const { data: redeemed } = await db
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (redeemed) return none;
  }

  let discounted = input.baseAmount;
  if (promo.discount_type === "flat") {
    discounted = Math.max(0, input.baseAmount - Number(promo.discount_amount));
  } else if (promo.discount_type === "percent") {
    discounted = input.baseAmount * (1 - Number(promo.discount_percent) / 100);
  }

  return { discountedAmount: Number(discounted.toFixed(2)), promoId: promo.id };
}

/**
 * Record that a promo was used. Written server-side for staff bookings so
 * their uses count toward max_uses like online redemptions do. Failures are
 * logged, not thrown: the booking itself has already been saved.
 */
export async function recordPromoRedemption(
  db: SupabaseClient,
  input: { promoId: number; userId: string | null; customerEmail: string | null }
): Promise<void> {
  const { error } = await db.from("promo_code_redemptions").insert({
    promo_code_id: input.promoId,
    user_id: input.userId,
    customer_email: input.customerEmail,
  });
  if (error) console.error("Failed to record promo redemption:", error);
}
