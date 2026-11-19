"use client";

import { useAuth } from "@/context/auth-context";
import { getActiveSubscription } from "@/lib/services/subscriptionService";
import { Subscription } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

/**
 * includeOverdue: also load a past_due / unpaid plan (Billing page only).
 * skip: the page already has the membership (loaded on the server); no fetch.
 */
export function useSubscription({
  includeOverdue = false,
  skip = false,
}: { includeOverdue?: boolean; skip?: boolean } = {}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  // The user the current subscription was loaded for. When sign-in finishes,
  // there is one render before the effect below starts loading; without this
  // that render reports "not loading, no membership", and a member could
  // briefly be offered payment for a free wash.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (skip) return;
    if (!user?.id) {
      setSubscription(null);
      setLoadedFor(null);
      setLoading(false);
      return;
    }
    loadSubscrption();
  }, [user?.id, skip]);

  async function loadSubscrption() {
    const userId = user?.id;
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const sub = await getActiveSubscription(supabase, userId, { includeOverdue });
      setSubscription(sub);
    } catch (err) {
      console.error("Error fetching subscription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load subscription"
      );
      setSubscription(null);
    } finally {
      setLoadedFor(userId);
      setLoading(false);
    }
  }

  if (skip) {
    return { subscription: null, loading: false, error: null, refetch: loadSubscrption };
  }
  const notLoadedForUser = !!user?.id && loadedFor !== user.id;
  return { subscription, loading: loading || notLoadedForUser, error, refetch: loadSubscrption };
}
