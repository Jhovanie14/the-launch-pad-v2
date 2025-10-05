// hooks/usePricingPlans.ts
"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { pricingService } from "@/lib/services/pricingService";

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
}

export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const data = await pricingService.getPlans(supabase);
        setPlans(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load pricing");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [supabase]);

  return { plans, loading, error };
}
