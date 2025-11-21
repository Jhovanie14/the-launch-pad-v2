"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import { Crown } from "lucide-react";

import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { usePricingPlans } from "@/hooks/usePricingPlans";

import AuthPromptModal from "@/components/user/authPromptModal";
import PricingCard from "@/components/pricing-plan";
import LoadingDots from "@/components/loading";
import { useSelfService } from "@/hooks/useSelfService";

export default function PricingPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { plans, loading } = usePricingPlans();

  const [activeTab, setActiveTab] = useState<"subscriptions" | "selfservice">(
    "subscriptions"
  );

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
    return <LoadingDots />;
  }

  return (
    <section>
      <header className="py-10 text-center">
        <Header user={user} userProfile={userProfile} />
        <SubscriptionTabs activeTab={activeTab} setActiveTab={setActiveTab} />
        <PricingToggle pricing={pricing} setPricing={setPricing} />
      </header>

      {/* TAB: Carwash Subscriptions */}
      {activeTab === "subscriptions" && (
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
      )}

      {/* TAB: Self-Service Membership */}
      {activeTab === "selfservice" && <SelfServiceSection user={user} />}

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </section>
  );
}

/* ------------------------- Components ------------------------- */

function Header({ user, userProfile }: { user: any; userProfile: any }) {
  if (user) {
    return (
      <div className="space-y-3 mb-8">
        <div className="flex flex-col items-center justify-center gap-2 mb-4">
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

function SubscriptionTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: "subscriptions" | "selfservice") => void;
}) {
  return (
    <div className="flex justify-center mb-10">
      <div className="bg-gray-100 p-1 rounded-lg inline-flex">
        {["subscriptions", "selfservice"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === tab
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-blue-900"
            }`}
          >
            {tab === "subscriptions" ? "Carwash Plans" : "Self-Service Bay"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelfServiceSection({ user }: { user: any }) {
  const router = useRouter();
  const { plan, subscription, usedToday, loading } = useSelfService(user);

  const pricingObj = "monthly"; // self-service is monthly only
  const handleCheckout = (planId: string) => {
    router.push("/dashboard/pricing/self-service-cart");
  };

  if (!user) {
    return (
      <p className="text-center text-lg text-muted-foreground">
        Login to view your Self-Service Bay Membership
      </p>
    );
  }

  if (loading || !plan) return <LoadingDots />;

  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <h2 className="text-3xl font-semibold text-blue-900 mb-6">
        Self-Service Bay Membership
      </h2>

      <PricingCard
        plan={plan}
        pricing={pricingObj}
        subscription={subscription} // will handle active state inside card
        handleCheckout={handleCheckout}
      />

      {/* Daily usage info below the card */}
      {subscription && (
        <div className="mt-4">
          <p className="font-semibold">Status: Active</p>
          <p>
            Started: {new Date(subscription.started_at).toLocaleDateString()}
          </p>
          <p className="mt-2">
            {usedToday ? "Used today" : "Not used yet today"}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/selfservice/use")}
          >
            Log a Visit
          </Button>
        </div>
      )}
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
