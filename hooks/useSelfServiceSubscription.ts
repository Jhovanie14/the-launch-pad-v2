"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import { getActiveSelfServiceSubscription } from "@/lib/services/selfServiceSubscriptionService";
import { SelfServiceSubscription } from "@/types";

export function useSelfServiceSubscription() {
  const [subscription, setSubscription] =
    useState<SelfServiceSubscription | null>(null);
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
    loadSubscription();
  }, [user?.id]);

  async function loadSubscription() {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const sub = await getActiveSelfServiceSubscription(supabase, user.id);
      setSubscription(sub);
    } catch (err) {
      console.error("Error fetching self-service subscription:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load self-service subscription"
      );
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }

  return { subscription, loading, error };
}
