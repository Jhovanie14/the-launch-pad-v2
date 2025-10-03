"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-context";
import { Subscription } from "@/types";

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const { data: subs, error: subError } = await supabase
          .from("user_subscription")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (subError) throw subError;

        if (subs) {
          // fetch related plan manually since auto join is failing
          const { data: plan, error: planError } = await supabase
            .from("subscription_plans")
            .select("name, description, monthly_price, yearly_price")
            .eq("id", subs.subscription_plan_id) // use your FK column name here
            .maybeSingle();

          if (planError) throw planError;

          setSubscription({
            ...subs,
            plan_id: subs.subscription_plan_id,
            subscription_plans: plan,
            billing_cycle: subs.billing_cycle || "month", // default to monthly
          });
        } else {
          setSubscription(null);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [user?.id,]);

  return { subscription, loading };
}
