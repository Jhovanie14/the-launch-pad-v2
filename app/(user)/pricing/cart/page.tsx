"use client";

import { Suspense } from "react";
import SubscriptionCart from "@/components/subscription/SubscriptionCart";
import AuthPromptModal from "@/components/user/authPromptModal";
import { useAuth } from "@/context/auth-context";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

function CartContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const billing =
    (searchParams.get("billing") as "monthly" | "yearly") || "monthly";
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
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
    </>
  );
}

export default function PricingCartPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="p-8">Loading…</div>}>
          <CartContent />
        </Suspense>
      </div>
    </main>
  );
}
