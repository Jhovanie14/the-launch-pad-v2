"use client";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserVehicles, UserVehicle } from "@/hooks/useUserVehicles";
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
  savedVehicles: UserVehicle[];
  stepBasePath: "" | "/dashboard/booking";
  successPath: "/success" | "/dashboard/bookings/success";
}

// Both route shells call this. For real guests, useAuth/useSubscription/
// useUserVehicles all no-op to null/[] — which yields the spec's
// "empty/false" guest context. A logged-in user visiting the guest URLs gets
// real auth state, preserving the old guest tree's logged-in handling.
export function useBookingAuthContext(variant: BookingVariant): BookingAuthContext {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const { vehicles } = useUserVehicles();
  const dashboard = variant === "dashboard";
  return {
    variant,
    isAuthenticated: !!user,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userFullName: (user?.user_metadata?.full_name as string | undefined) ?? null,
    subscription,
    savedVehicles: dashboard ? vehicles : [],
    stepBasePath: dashboard ? "/dashboard/booking" : "",
    successPath: dashboard ? "/dashboard/bookings/success" : "/success",
  };
}
