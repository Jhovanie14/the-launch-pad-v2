"use client";

import SubscriptionCart from "@/components/subscription/SubscriptionCart";
import AuthPromptModal from "@/components/user/authPromptModal";
import { useAuth } from "@/context/auth-context";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function PricingCartPage() {
  const searchParams = useSearchParams();
  const { user, userProfile } = useAuth();
  const planId = searchParams.get("plan");
  const billing =
    (searchParams.get("billing") as "monthly" | "yearly") || "monthly";

  const [authOpen, setAuthOpen] = useState(false);

  const handleCheckout = async () => {
    try {
      if (!user) {
        setAuthOpen(true);
        return;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <SubscriptionCart
          planId={planId ?? undefined}
          billingCycle={billing}
          onRequireAuth={() => {
            localStorage.setItem(
              "pendingSubscriptionIntent",
              JSON.stringify({ planId, billing })
            );
            setAuthOpen(true);
          }}
        />
        <AuthPromptModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          next={`/dashboard/pricing/subscription?plan=${planId}&billing=${billing}`}
        />
      </div>
    </main>
  );
}
