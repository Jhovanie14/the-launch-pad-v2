"use client";

import { useAuth } from "@/context/auth-context";
import { getActiveSubscription } from "@/lib/services/subscriptionService";
import { Subscription } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useState } from "react";

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    loadSubscrption();
  }, [user?.id]);

  async function loadSubscrption() {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      // console.log("abot dri")
      const sub = await getActiveSubscription(supabase, user?.id);
      setSubscription(sub);
    } catch (err) {
      console.error("Error fetching subscription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load subscription"
      );
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }

  return { subscription, loading, error };
}
