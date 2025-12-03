"use client";

import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Gem, X } from "lucide-react";
import { Separator } from "./ui/separator";

export default function PricingCard({
  plan,
  pricing,
  subscription,
  handleCheckout,
}: {
  plan: any;
  pricing: "monthly" | "yearly";
  subscription: any;
  handleCheckout: (planId: string) => void;
}) {
  const normalizedBillingCycle =
    subscription?.billing_cycle === "year"
      ? "yearly"
      : subscription?.billing_cycle === "month"
        ? "monthly"
        : subscription?.billing_cycle;

  // const isCurrentPlan =
  //   subscription?.plan_id === plan.id && normalizedBillingCycle === pricing;

  // const buttonText = !subscription
  //   ? `Select ${plan.name}`
  //   : isCurrentPlan
  //     ? "Current Plan"
  //     : "Upgrade";

  // Detect if this is the self-service card
  const isSelfServicePlan = plan.name === "Self-Service Bay Membership";

  // Detect if the user has any subscription passed to this card
  const hasSubscription = Boolean(subscription);

  // Detect if this is a normal carwash plan the user currently has
  const isCurrentPlan =
    !isSelfServicePlan &&
    subscription?.plan_id === plan.id &&
    normalizedBillingCycle === pricing;

  // Button text logic
  let buttonText = `Select ${plan.name}`;

  if (hasSubscription) {
    if (isSelfServicePlan) {
      buttonText = "Add more vehicle"; // self-service rule
    } else if (isCurrentPlan) {
      buttonText = "Current Plan"; // normal plans
    } else {
      buttonText = "Upgrade"; // user has a plan → add vehicle
    }
  }

  // Popular plans
  const popularPlans = ["Suvs", "Small Truck"];
  const isPopular = popularPlans.includes(plan.name);

  // Calculate pricing with discount for yearly
  const monthlyPrice = Number(plan.monthly_price) || 0;
  const yearlyPrice = Number(plan.yearly_price) || 0;
  const monthlyEquivalent = monthlyPrice * 12; // What yearly would cost if paid monthly
  const isYearly = pricing === "yearly";
  const showDiscount = isYearly && monthlyEquivalent > 0;
  const discountPercentage = showDiscount
    ? Math.round(((monthlyEquivalent - yearlyPrice) / monthlyEquivalent) * 100)
    : 0;
  const currentPrice = isYearly ? yearlyPrice : monthlyPrice;
  const originalPrice = isYearly ? monthlyEquivalent : null;

  return (
    <div className={`relative ${isPopular ? "md:scale-105" : ""}`}>
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 -right-3 z-10">
          <div className="bg-linear-to-r from-yellow-400 to-yellow-500 text-slate-900 px-3 py-1 text-xs font-bold rounded-full transform rotate-24 shadow-lg">
            POPULAR
          </div>
        </div>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-linear-to-r from-yellow-400 to-yellow-500 text-slate-900 px-3 py-1 text-xs font-bold rounded-full transform shadow-lg">
            CURRENT PLAN
          </div>
        </div>
      )}

      {/* 20% Discount badge for yearly */}
      {showDiscount && discountPercentage > 0 && (
        <div className="absolute -top-3 -left-3 z-10">
          <div className="bg-linear-to-r from-green-500 to-green-600 text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg">
            {discountPercentage}% OFF
          </div>
        </div>
      )}

      {/* Popular side bar */}
      {isPopular && (
        <div className="absolute -right-1 top-0 bottom-0 w-1 bg-linear-to-b from-yellow-400 to-yellow-500 rounded-r-lg" />
      )}

      <Card
        className={`relative flex flex-col overflow-hidden transition-all duration-300 p-0 ${
          isPopular
            ? "border-yellow-400/50 shadow-xl shadow-yellow-400/20"
            : isCurrentPlan
              ? "border-accent shadow-lg shadow-accent/20"
              : ""
        }`}
      >
        <div className="bg-blue-900 px-6 pt-6 pb-8 relative">
          <div className="mb-4 flex justify-center">
            {plan.image_url ? (
              <img
                src={plan.image_url}
                alt={plan.name}
                className="w-full h-32 object-cover"
              />
            ) : (
              <Gem className="w-full h-32 text-white stroke-1" />
            )}
          </div>
          <CardTitle className="text-center text-white text-lg font-semibold">
            {plan.name}
          </CardTitle>

          {/* Inverted triangle pointer */}
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-24 border-l-transparent border-r-24 border-r-transparent border-t-24 border-t-blue-900" />
        </div>

        <div className="bg-white px-6 py-6 text-center border-b border-slate-200">
          <div className="flex flex-col items-center gap-2 mb-3">
            {/* Original price with strikethrough (for yearly) */}
            {showDiscount && originalPrice && (
              <div className="flex items-center gap-2">
                <span className="text-lg text-slate-500 line-through">
                  ${originalPrice.toFixed(2)}
                </span>
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded">
                  Save ${(originalPrice - currentPrice).toFixed(2)}
                </span>
              </div>
            )}
            {/* Current price */}
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-slate-900">
                ${currentPrice.toFixed(2)}
              </span>
              <span className="text-slate-600 font-medium">
                /{pricing === "monthly" ? "mo" : "yr"}
              </span>
            </div>
            {/* Equivalent monthly price for yearly */}
            {isYearly && (
              <p className="text-xs text-slate-500">
                ${(currentPrice / 12).toFixed(2)}/month billed annually
              </p>
            )}
          </div>
          <Separator />
          <div className="my-6 flex justify-center">
            <Check className="w-6 h-6 text-slate-900" />
          </div>
          <Separator />
        </div>

        <CardContent className="flex-1 px-6 py-6 bg-white">
          <CardDescription className="text-xs text-slate-600 leading-relaxed mb-4">
            {plan.description}
          </CardDescription>
          <ul className="space-y-3" role="list">
            {plan.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                {feature.toLowerCase().includes("not") ? (
                  <X className="h-5 w-5 shrink-0 text-slate-400 mt-0.5" />
                ) : (
                  <Check className="h-5 w-5 shrink-0 text-slate-900 mt-0.5" />
                )}
                <span className="text-sm text-accent-foreground">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>

        <CardFooter className="px-6 py-6 bg-white border-t border-slate-200">
          <Button
            variant="outline"
            className={`w-full font-semibold transition-all cursor-pointer ${
              isPopular
                ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                : isCurrentPlan
                  ? "bg-accent text-accent-foreground border-accent hover:bg-accent/90"
                  : "border-slate-900 text-slate-900 hover:bg-slate-50"
            }`}
            onClick={() => handleCheckout(plan.id)}
            aria-label={`Select ${plan.name} plan`}
            disabled={isCurrentPlan}
          >
            {buttonText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
