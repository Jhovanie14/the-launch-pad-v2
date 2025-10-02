"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { useState, useEffect } from "react";
import { CheckCircle2, Crown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { UserNavbar } from "@/components/user/navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthPromptModal from "@/components/user/authPromptModal";
import { useRouter } from "next/navigation";

interface PricingPlan {
  id: string;
  name: string;
  monthly_price: number;
  yearly_price: number;
  features: string[];
}

export default function PricingContent() {
  const router = useRouter();
  const supabase = createClient();
  const [pricing, setPricing] = useState<"monthly" | "yearly">("monthly");
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();

  // Fetch pricing plans
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        const { data } = await supabase
          .from("subscription_plans")
          .select("*")
          .order("monthly_price", { ascending: true });

        setPricingPlans(data ?? []);
      } catch (error) {
        console.error("Error fetching pricing plans:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPricingPlans();
  }, []);

  const handleCheckout = async (planId: string) => {
    try {
      if (!user) {
        setAuthOpen(true);
        return;
      }
      console.log("➡️ Checkout planId (from frontend):", planId);

      // const response = await fetch("/api/create-checkout-session", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     planId,
      //     billingCycle: pricing,
      //     userId: user?.id,
      //   }),
      // });

      // const { url } = await response.json();
      // if (url) {
      //   window.location.href = url;
      // }
      const params = new URLSearchParams({ plan: planId, billing: pricing });
      router.push(`/dashboard/pricing/subscription?${params.toString()}`);
    } catch (error) {
      console.error("Error creating checkout session:", error);
    }
  };

  // const handleManageSubscription = async () => {
  //   try {
  //     const response = await fetch("/api/create-customer-portal", {
  //       method: "POST",
  //     });
  //     const { url } = await response.json();
  //     if (url) {
  //       window.location.href = url;
  //     }
  //   } catch (error) {
  //     console.error("Error creating customer portal session:", error);
  //   }
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="animate-pulse bg-white rounded-lg p-6 h-48"></div>
            <div className="animate-pulse bg-white rounded-lg p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="py-20">
        <div className="space-y-3 mb-8 text-center">
          {user ? (
            <>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="w-8 h-8 text-blue-900" />
                <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
                  Manage Your Subscription
                </h1>
              </div>
              <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                Welcome back, {userProfile?.full_name || user.email}!
                {userProfile?.provider === "google" && (
                  <span className="block text-sm text-blue-600 mt-1">
                    Signed in with Google
                  </span>
                )}
              </p>
              {/* <div className="flex items-center justify-center gap-4 mt-6">
                  <Button
                    // onClick={handleManageSubscription}
                    className="bg-blue-900 text-white hover:bg-blue-800"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Manage Subscription
                  </Button>
                </div> */}
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
                Choose Your Plan
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-muted-foreground">
                Select the perfect plan for your car care needs
              </p>
            </>
          )}
        </div>

        {/* Pricing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setPricing("monthly")}
              className={`px-6 py-2 rounded-md transition-colors ${
                pricing === "monthly"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-blue-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPricing("yearly")}
              className={`px-6 py-2 rounded-md transition-colors ${
                pricing === "yearly"
                  ? "bg-white text-blue-900 shadow-sm"
                  : "text-gray-600 hover:text-blue-900"
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.id}
              className="flex flex-col h-full border-2 hover:border-blue-200 transition-colors"
            >
              <CardHeader className="text-center flex flex-col">
                <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </CardTitle>
                <CardDescription className=" text-blue-900 text-4xl font-bold">
                  $
                  {pricing === "monthly"
                    ? plan.monthly_price
                    : plan.yearly_price}{" "}
                  <span className="text-gray-600 text-base">
                    /{pricing === "monthly" ? "month" : "year"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-3 mb-8 flex-1 text-left">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <div className="w-5 h-5 text-green-500 rounded-full flex items-center justify-center mr-3">
                        <CheckCircle2 />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleCheckout(plan.id)}
                  className="w-full bg-blue-900 text-white hover:bg-blue-800 py-3 mt-auto"
                  disabled={
                    subscription?.plan_id === plan.id &&
                    subscription.billing_cycle === pricing
                  }
                >
                  {!subscription
                    ? "Get Started"
                    : subscription.plan_id === plan.id &&
                        subscription.billing_cycle === pricing
                      ? "Current Plan"
                      : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
