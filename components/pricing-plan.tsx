import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
    subscription?.billing_cycle === "month"
      ? "monthly"
      : subscription?.billing_cycle;

  const isCurrentPlan =
    subscription?.plan_id === plan.id && normalizedBillingCycle === pricing;

  const buttonText = !subscription
    ? `Select ${plan.name}` // No subscription yet
    : isCurrentPlan
      ? "Current Plan" // This is the active plan
      : "Upgrade";

  return (
    <Card
      className={`relative flex flex-col ${
        isCurrentPlan
          ? "border-primary shadow-lg shadow-primary/20 scale-105"
          : ""
      }`}
    >
      {isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-accent px-4 py-1 text-xs font-semibold text-accent-foreground">
            Your Plan
          </span>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription className="">{plan.description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">
            ${pricing === "monthly" ? plan.monthly_price : plan.yearly_price}
          </span>
          <span className="text-muted-foreground">
            /{pricing === "monthly" ? "month" : "year"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3" role="list">
          {plan.features.map((feature: string, index: number) => (
            <li key={index} className="flex items-start gap-3">
              <Check
                className="h-5 w-5 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          variant={plan.buttonVariant}
          className={`w-full ${isCurrentPlan ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
          onClick={() => handleCheckout(plan.id)}
          aria-label={`Select ${plan.name} plan`}
          disabled={isCurrentPlan}
        >
          {buttonText}
        </Button>
      </CardFooter>
      {/* <CardContent className=" flex-1">
          <ul className="space-y-3 mb-8 flex-1 text-left">
            {plan.features.map((feature: string, index: number) => (
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
            disabled={isCurrentPlan}
          >
            {!subscription
              ? "Get Started"
              : isCurrentPlan
                ? "Current Plan"
                : "Upgrade"}
          </Button>
        </CardContent> */}
    </Card>
  );
}
