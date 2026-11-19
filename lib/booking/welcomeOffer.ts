import type { SupabaseClient } from "@supabase/supabase-js";
import { promoAppliesToOneTime } from "@/lib/pricing/promoRules";

/** The code the guest account pop-up advertises. */
export const WELCOME_CODE = "WELCOME10";

export interface WelcomeOffer {
  code: string;
  percent: number;
}

interface PromoRow {
  code: string;
  is_active: boolean | null;
  applies_to: string | null;
  discount_type: string | null;
  discount_percent: number | null;
  max_uses: number | null;
  used_count: number | null;
  restricted_to_service: string | null;
}

/**
 * The offer to advertise, or null. It follows checkout's own acceptance rules
 * (lib/pricing/validatePromo.ts), so the pop-up never promises a code that
 * checkout would refuse. A service-restricted code is left out because the
 * pop-up can't say which service it is for, and a flat code has no percent.
 * expires_at is ignored on purpose: checkout ignores it too.
 */
export function welcomeOfferFromPromo(promo: PromoRow | null, redemptions: number): WelcomeOffer | null {
  if (!promo || !promo.is_active) return null;
  if (!promoAppliesToOneTime(promo.applies_to)) return null;
  if (promo.restricted_to_service) return null;
  if (promo.discount_type !== "percent") return null;
  const percent = Number(promo.discount_percent);
  if (!(percent > 0 && percent <= 100)) return null;
  if (promo.max_uses != null) {
    const uses = Math.max(Number(promo.used_count) || 0, redemptions);
    if (uses >= Number(promo.max_uses)) return null;
  }
  return { code: promo.code, percent };
}

/** Reads the welcome code with the service-role client (promo codes are staff-only). */
export async function loadWelcomeOffer(admin: SupabaseClient): Promise<WelcomeOffer | null> {
  try {
    const { data: promo, error } = await admin
      .from("promo_codes")
      .select(
        "id, code, is_active, applies_to, discount_type, discount_percent, max_uses, used_count, restricted_to_service"
      )
      .ilike("code", WELCOME_CODE)
      .maybeSingle();
    if (error || !promo) return null;
    let redemptions = 0;
    if (promo.max_uses != null) {
      const { count, error: countError } = await admin
        .from("promo_code_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("promo_code_id", promo.id);
      if (countError) return null;
      redemptions = count ?? 0;
    }
    return welcomeOfferFromPromo(promo as PromoRow, redemptions);
  } catch {
    return null;
  }
}
