// lib/services/pricingService.ts
import { SupabaseClient } from "@supabase/supabase-js";

export const pricingService = {
  async getPlans(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("monthly_price", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
