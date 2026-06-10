import type { SupabaseClient } from "@supabase/supabase-js";

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
 * Validate a promo code against the DB and return the discounted amount.
 * Any failure (inactive, maxed, restricted, already redeemed, missing) is a
 * silent no-op that returns the original amount — never throws.
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
      "id, discount_type, discount_percent, discount_amount, is_active, max_uses, used_count, restricted_to_service"
    )
    .ilike("code", code)
    .maybeSingle();

  if (!promo || !promo.is_active) return none;
  if (promo.max_uses != null && Number(promo.used_count) >= Number(promo.max_uses))
    return none;
  if (
    promo.restricted_to_service &&
    promo.restricted_to_service !== input.serviceId
  )
    return none;

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
