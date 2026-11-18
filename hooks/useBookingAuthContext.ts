"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import type { Subscription } from "@/types";

export type BookingVariant = "guest" | "dashboard";

// The spec interface plus: variant (gates guest-tree-only UI like the
// subscription upsell), user email/name (the checkout payload needs them),
// and stepBasePath (the two trees mount the same steps at different URLs).
export interface BookingAuthContext {
  variant: BookingVariant;
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  userFullName: string | null;
  subscription: Subscription | null;
  /**
   * Sign-in and membership have both loaded. Until then a member's free wash
   * is not known yet, so the confirmation step must not offer payment.
   */
  ready: boolean;
  stepBasePath: "" | "/dashboard/booking";
  successPath: "/success" | "/dashboard/bookings/success";
}

// Both route shells call this. For real guests, useAuth/useSubscription
// no-op to null — which yields the spec's "empty/false" guest context. A
// logged-in user visiting the guest URLs gets real auth state, preserving the
// old guest tree's logged-in handling. (The saved-vehicles list used to load
// here on every step — five queries — and no booking step read it.)
export function useBookingAuthContext(variant: BookingVariant): BookingAuthContext {
  const { user, isLoading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const dashboard = variant === "dashboard";
  return {
    variant,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userFullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
    subscription,
    ready: !authLoading && !subscriptionLoading,
    stepBasePath: dashboard ? "/dashboard/booking" : "",
    successPath: dashboard ? "/dashboard/bookings/success" : "/success",
  };
}
