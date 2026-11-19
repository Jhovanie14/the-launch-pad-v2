"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";
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

// Both route shells call this. When the step page loaded sign-in and the
// membership on the server (`initial`), those are used from the first render
// and nothing is fetched again. If the server could not load the membership,
// it falls back to the browser: useAuth/useSubscription, which no-op to null
// for real guests. A logged-in user visiting the guest URLs gets real auth
// state either way. If the customer signs out in another tab, the server's
// values stay for that page; createBooking and the checkout route re-check
// the session on submit.
export function useBookingAuthContext(
  variant: BookingVariant,
  initial?: BookingInitialData
): BookingAuthContext {
  const fromServer = initial !== undefined && initial.subscription !== undefined;
  const { user, isLoading: authLoading } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription({ skip: fromServer });
  const dashboard = variant === "dashboard";
  const paths = {
    stepBasePath: dashboard ? ("/dashboard/booking" as const) : ("" as const),
    successPath: dashboard ? ("/dashboard/bookings/success" as const) : ("/success" as const),
  };

  if (fromServer) {
    return {
      variant,
      isAuthenticated: !!initial.user,
      userId: initial.user?.id ?? null,
      userEmail: initial.user?.email ?? null,
      userFullName: initial.user?.fullName ?? null,
      subscription: initial.subscription ?? null,
      ready: true,
      ...paths,
    };
  }

  return {
    variant,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userFullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
    subscription,
    ready: !authLoading && !subscriptionLoading,
    ...paths,
  };
}
