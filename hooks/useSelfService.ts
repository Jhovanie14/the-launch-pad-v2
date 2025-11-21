"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export function useSelfService(user: any) {
  const [plan, setPlan] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [usedToday, setUsedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active self-service plan
        const { data: planData, error: planError } = await supabase
          .from("self_service_plans")
          .select("*")
          .eq("is_active", true)
          .single();

        if (planError) throw planError;
        setPlan(planData);

        // Fetch user's subscription
        if (user) {
          const { data: subData, error: subError } = await supabase
            .from("self_service_subscriptions")
            .select("*")
            .eq("user_id", user?.id)
            .maybeSingle();

          if (subError && subError.code !== "PGRST116") throw subError; // ignore "no row found"
          setSubscription(subData || null);

          // Check if used today
          const today = new Date().toISOString().slice(0, 10);
          setUsedToday(subData?.last_used_date === today || false);
        }
      } catch (err) {
        console.error("Failed to fetch self-service data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return { plan, subscription, usedToday, loading };
}
