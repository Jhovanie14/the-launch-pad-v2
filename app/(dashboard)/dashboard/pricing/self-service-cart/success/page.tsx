import { CheckCircle, Package, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface SubscriptionSuccessPageProps {
  searchParams: { session_id?: string };
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: SubscriptionSuccessPageProps) {
  const supabase = createClient();
  const { session_id } = await searchParams;

  if (!session_id) return redirect("/dashboard");

  // Retrieve Stripe Checkout session
  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.status === "open") return redirect("/subscription/plans");
  if (session.mode !== "subscription" || !session.subscription)
    return redirect("/dashboard");

  let subscription: any = null;
  const timeout = Date.now() + 15000; // 15s polling

  // Determine subscription type via metadata
  const isSelfService = session.metadata?.plan_type === "self_service";

  while (!subscription && Date.now() < timeout) {
    if (isSelfService) {
      const { data } = await supabase
        .from("self_service_subscriptions")
        .select(
          `
          *,
          self_service_plans:self_service_plan_id (
            name,
            description,
            monthly_price,
            yearly_price
          ),
          subscription_vehicles (
            vehicles (
              make,
              model,
              year
            )
          )
        `
        )
        .eq("stripe_subscription_id", session.subscription as string)
        .maybeSingle();

      subscription = data;
    } else {
      const { data } = await supabase
        .from("user_subscription")
        .select(
          `
          *,
          subscription_plans:subscription_plan_id (
            name,
            description,
            monthly_price,
            yearly_price
          ),
          subscription_vehicles (
            vehicles (
              make,
              model,
              year
            )
          )
        `
        )
        .eq("stripe_subscription_id", session.subscription as string)
        .maybeSingle();

      subscription = data;
    }

    if (!subscription) await new Promise((res) => setTimeout(res, 1000));
  }

  // Fallback to Stripe if no record found in Supabase
  if (!subscription) {
    const stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const subItem = stripeSub.items.data[0];
    const priceObj = subItem.price;
    const cps = Number(subItem.current_period_start);
    const cpe = Number(subItem.current_period_end);

    subscription = {
      stripe_subscription_id: stripeSub.id,
      billing_cycle: priceObj.recurring?.interval || "month",
      current_period_start: Number.isFinite(cps)
        ? new Date(cps * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: Number.isFinite(cpe)
        ? new Date(cpe * 1000).toISOString()
        : null,
      status: stripeSub.status,
      subscription_plans: isSelfService
        ? {
            name: priceObj.nickname || "Self-Service Plan",
            monthly_price:
              priceObj.recurring?.interval === "month" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
            yearly_price:
              priceObj.recurring?.interval === "year" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
          }
        : {
            name: priceObj.nickname || "Premium Plan",
            monthly_price:
              priceObj.recurring?.interval === "month" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
            yearly_price:
              priceObj.recurring?.interval === "year" && priceObj.unit_amount
                ? priceObj.unit_amount / 100
                : null,
          },
      subscription_vehicles: [],
      created_at: new Date().toISOString(),
    };
  }

  // Extract plan and vehicle info
  const plan = subscription.subscription_plans;
  const vehicle = subscription.subscription_vehicles?.[0]?.vehicles;
  const planPrice =
    subscription.billing_cycle === "month"
      ? (plan?.monthly_price ?? 0)
      : (plan?.yearly_price ?? 0);

  const orderData = {
    date: new Date(subscription.created_at).toLocaleDateString(),
    orderNumber: subscription.stripe_subscription_id,
    paymentMethod: "Card",
    planName: plan?.name ?? "Plan",
    planPrice,
    billingCycle: subscription.billing_cycle,
    startDate: new Date(subscription.current_period_start).toLocaleDateString(),
    nextBillingDate: subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : "N/A",
    vehicle: vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : null,
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Subscription Activated!
          </h1>
          <p className="text-muted-foreground text-lg">
            Thank you for subscribing. Your subscription is now active.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Activation Date
              </div>
              <span className="font-medium">{orderData.date}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subscription ID</span>
              <span className="font-medium font-mono text-xs">
                {orderData.orderNumber}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </div>
              <span className="font-medium">{orderData.paymentMethod}</span>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Plan Information</h4>
              <div className="flex justify-between items-center">
                <span className="text-sm">Plan</span>
                <span className="font-medium">{orderData.planName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Billing Cycle</span>
                <span className="font-medium capitalize">
                  {orderData.billingCycle}ly
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Price</span>
                <span className="font-medium">
                  ${orderData.planPrice.toFixed(2)}/{orderData.billingCycle}
                </span>
              </div>
              {orderData.vehicle && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Vehicle</span>
                  <span className="font-medium">{orderData.vehicle}</span>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Started</span>
                <span>{orderData.startDate}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Next Billing Date</span>
                <span>{orderData.nextBillingDate}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Amount Due Today</span>
                <span className="text-primary">
                  ${orderData.planPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button asChild className="w-full bg-blue-900" size="lg">
            <Link href="/dashboard/billing">Manage Subscription</Link>
          </Button>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </div>

        <div className="text-center mt-8 p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to your registered email address.
            You can manage your subscription, update payment methods, or cancel
            anytime from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
