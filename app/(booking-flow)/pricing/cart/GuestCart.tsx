"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import SubscriptionCart from "@/components/subscription/SubscriptionCart";
import AuthPromptModal from "@/components/user/authPromptModal";
import { PENDING_CART_KEY, pendingCartPayload } from "@/lib/subscriptions/pendingCart";

/**
 * The membership cart for guests. Checkout needs an account, so "Sign in to
 * continue" saves the plates and opens the sign-in prompt; the signed-in cart
 * restores them and asks for the agreement again (the price may change once
 * we know the account).
 */
export function GuestCart() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const billing = (searchParams.get("billing") as "monthly" | "yearly") || "monthly";
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <SubscriptionCart
        planId={planId ?? undefined}
        billingCycle={billing}
        onRequireAuth={(plates) => {
          try {
            localStorage.setItem(PENDING_CART_KEY, pendingCartPayload(plates ?? [], planId, billing));
            localStorage.setItem("pendingSubscriptionIntent", JSON.stringify({ planId, billing }));
          } catch {
            // Storage blocked (private window): the plates are typed again after sign-in.
          }
          setAuthOpen(true);
        }}
      />
      <AuthPromptModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        next={`/dashboard/pricing/subscription?plan=${planId}&billing=${billing}`}
      />
    </>
  );
}
