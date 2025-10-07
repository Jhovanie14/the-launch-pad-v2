"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Crown } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { usePricingPlans } from "@/hooks/usePricingPlans";

import AuthPromptModal from "@/components/user/authPromptModal";
import PricingCard from "@/components/pricing-plan";

export default function PricingPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { plans, loading } = usePricingPlans();

  const [pricing, setPricing] = useState<"monthly" | "yearly">("monthly");
  const [authOpen, setAuthOpen] = useState(false);

  const handleCheckout = (planId: string) => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const params = new URLSearchParams({ plan: planId, billing: pricing });
    router.push(`/dashboard/pricing/subscription?${params.toString()}`);
  };

  if (loading) {
    return (
      <>
        {/* Header Skeleton */}
        <section className="py-20 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="animate-pulse bg-gray-200 h-8 w-40 rounded-lg"></div>
            <div className="animate-pulse bg-gray-200 h-5 w-64 rounded-lg"></div>
          </div>

          {/* Pricing toggle skeleton */}
          <div className="mt-10 flex justify-center space-x-4">
            <div className="animate-pulse bg-gray-200 h-10 w-28 rounded-full"></div>
            <div className="animate-pulse bg-gray-200 h-10 w-28 rounded-full"></div>
          </div>
        </section>

        {/* Pricing cards grid skeleton */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white rounded-2xl shadow-md p-8 flex flex-col items-center space-y-6"
            >
              <div className="bg-gray-200 h-6 w-32 rounded"></div>
              <div className="bg-gray-200 h-10 w-24 rounded"></div>
              <div className="bg-gray-200 h-4 w-40 rounded"></div>
              <div className="bg-gray-200 h-4 w-28 rounded"></div>
              <div className="bg-gray-200 h-10 w-full rounded mt-4"></div>
            </div>
          ))}
        </section>
      </>
    );
  }

  return (
    <>
      <section className="py-20 text-center">
        <Header user={user} userProfile={userProfile} />
        <PricingToggle pricing={pricing} setPricing={setPricing} />
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 md:px-0">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            pricing={pricing}
            subscription={subscription}
            handleCheckout={handleCheckout}
          />
        ))}
      </section>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}

/* ------------------------- Components ------------------------- */

function Header({ user, userProfile }: { user: any; userProfile: any }) {
  if (user) {
    return (
      <div className="space-y-3 mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Crown className="w-8 h-8 text-blue-900" />
          <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
            Manage Your Subscription
          </h1>
        </div>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
          Welcome back, {userProfile?.full_name || user.email}!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-8">
      <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
        Choose Your Plan
      </h1>
      <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
        Select the perfect plan for your car care needs
      </p>
    </div>
  );
}

function PricingToggle({
  pricing,
  setPricing,
}: {
  pricing: "monthly" | "yearly";
  setPricing: (value: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex justify-center mb-12">
      <div className="bg-gray-100 p-1 rounded-lg inline-flex">
        {["monthly", "yearly"].map((type) => (
          <button
            key={type}
            onClick={() => setPricing(type as "monthly" | "yearly")}
            className={`px-6 py-2 rounded-md transition-colors ${
              pricing === type
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-blue-900"
            }`}
          >
            {type === "monthly" ? "Monthly" : "Yearly (Save 20%)"}
          </button>
        ))}
      </div>
    </div>
  );
}
