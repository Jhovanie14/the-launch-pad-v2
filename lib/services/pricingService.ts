// lib/services/pricingService.ts
import { SupabaseClient } from "@supabase/supabase-js";

export const pricingService = {
  async getPlans(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
