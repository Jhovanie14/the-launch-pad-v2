import { CheckCircle, Package, Calendar, CreditCard, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import Stripe from "stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface SubscriptionSuccessPageProps {
  searchParams: { session_id?: string };
}

export default async function SubscriptionSuccessPage({
  searchParams,
}: SubscriptionSuccessPageProps) {
  const params = await searchParams;
  const supabase = createClient();

  if (!params.session_id) {
    return redirect("/dashboard");
  }

  // Retrieve the Checkout Session from Stripe
  const session = await stripe.checkout.sessions.retrieve(params.session_id);

  if (session.status === "open") {
    return redirect("/subscription/plans");
  }

  if (session.mode !== "subscription" || !session.subscription) {
    return redirect("/dashboard");
  }

  // Poll Supabase for subscription (wait for webhook to complete)
  let subscription: {
    stripe_subscription_id: string;
    billing_cycle: string;
    current_period_start: string;
    current_period_end: string | null;
    status: string;
    subscription_plans: {
      name: string;
      monthly_price: number | string | null;
      yearly_price: number | string | null;
    } | null;
    subscription_vehicles: Array<{
      vehicles: {
        id: string;
        make: string;
        model: string;
        year: number;
        body_type?: string;
        colors?: string[];
      } | null;
    }>;
    created_at: string;
  } | null = null;
  const timeout = Date.now() + 15000; // 15 seconds

  while (!subscription && Date.now() < timeout) {
    const { data, error } = await supabase
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
          id,
          vehicle:vehicles (
            id,
            make,
            model,
            year,
            body_type,
            colors
          )
        )
      `
      )
      .eq("stripe_subscription_id", session.subscription as string)
      .maybeSingle();

    if (error) {
      console.error("Error fetching subscription:", error);
    }

    subscription = data;

    if (!subscription) await new Promise((res) => setTimeout(res, 1000));
  }

  // If still not found, fallback to Stripe directly
  let stripeSub: Stripe.Subscription | null = null;
  if (!subscription) {
    stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
    const subscriptionItem = stripeSub.items.data[0];
    const priceObj = stripeSub.items.data[0].price;

    const cps = Number(subscriptionItem?.current_period_start);
    const cpe = Number(subscriptionItem?.current_period_end);

    const currentPeriodStartIso = Number.isFinite(cps)
      ? new Date(cps * 1000).toISOString()
      : new Date().toISOString();
    const currentPeriodEndIso = Number.isFinite(cpe)
      ? new Date(cpe * 1000).toISOString()
      : null;

    // Calculate base price from first item (full price)
    const basePriceAmount =
      priceObj.recurring?.interval === "month" && priceObj.unit_amount
        ? priceObj.unit_amount / 100
        : priceObj.recurring?.interval === "year" && priceObj.unit_amount
          ? priceObj.unit_amount / 100
          : 0;

    subscription = {
      stripe_subscription_id: stripeSub.id,
      billing_cycle: priceObj.recurring?.interval || "month",
      current_period_start: currentPeriodStartIso,
      current_period_end: currentPeriodEndIso,
      status: stripeSub.status,
      subscription_plans: {
        name: priceObj.nickname || "Premium Plan",
        monthly_price:
          priceObj.recurring?.interval === "month" ? basePriceAmount : null,
        yearly_price:
          priceObj.recurring?.interval === "year" ? basePriceAmount : null,
      },
      subscription_vehicles: [],
      created_at: new Date().toISOString(),
    };
  }

  const plan = subscription.subscription_plans;
  const basePrice =
    subscription.billing_cycle === "month"
      ? Number(plan?.monthly_price ?? 0)
      : Number(plan?.yearly_price ?? 0);

  // Extract all vehicles from subscription_vehicles
  // Handle both vehicle:vehicles and vehicles naming conventions
  const vehicles = (subscription.subscription_vehicles || [])
    .map((sv: any) => sv.vehicle || sv.vehicles)
    .filter((v): v is NonNullable<typeof v> => v !== null && v !== undefined);

  // If no vehicles found in DB, try to get from Stripe metadata
  let vehiclesFromStripe: Array<{
    id?: string;
    make: string;
    model: string;
    year: number;
    body_type?: string;
    colors?: string[];
  }> = [];

  if (vehicles.length === 0 && session.metadata?.vehicle_ids) {
    // Try to parse vehicle info from metadata if available
    // Note: This is a fallback - ideally vehicles should be in DB
    const vehicleCount = parseInt(session.metadata.vehicle_count || "1", 10);
    vehiclesFromStripe = Array.from({ length: vehicleCount }, (_, i) => ({
      make: "Vehicle",
      model: `${i + 1}`,
      year: new Date().getFullYear(),
    }));
  }

  // Use vehicles from DB, or fallback to Stripe metadata count
  const vehiclesToDisplay = vehicles.length > 0 ? vehicles : vehiclesFromStripe;

  // Calculate pricing for each vehicle (first full price, others 10% off)
  const vehiclePricing = vehiclesToDisplay.map((vehicle, index: number) => {
    const isFirstVehicle = index === 0;
    const price = isFirstVehicle ? basePrice : basePrice * 0.9;
    const discount = isFirstVehicle ? 0 : basePrice * 0.1;
    return {
      vehicle,
      price,
      discount,
      isDiscounted: !isFirstVehicle,
      displayName: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    };
  });

  // Get Stripe subscription for total calculation if not already retrieved
  if (!stripeSub) {
    stripeSub = await stripe.subscriptions.retrieve(
      session.subscription as string
    );
  }

  // Calculate total price from vehicle pricing, or fallback to Stripe total
  let totalPrice = vehiclePricing.reduce(
    (sum: number, item) => sum + item.price,
    0
  );
  const totalSavings = vehiclePricing.reduce(
    (sum: number, item) => sum + item.discount,
    0
  );

  // If no vehicles found, calculate total from Stripe line items
  if (vehiclePricing.length === 0 && stripeSub.items.data.length > 0) {
    totalPrice = stripeSub.items.data.reduce((sum: number, item) => {
      const amount = item.price.unit_amount ? item.price.unit_amount / 100 : 0;
      return sum + amount * (item.quantity || 1);
    }, 0);
  }

  const orderData = {
    date: new Date(subscription.created_at).toLocaleDateString(),
    orderNumber: subscription.stripe_subscription_id,
    paymentMethod: "Card",
    planName: plan?.name ?? "Premium Plan",
    basePrice,
    totalPrice,
    totalSavings,
    billingCycle: subscription.billing_cycle,
    startDate: new Date(subscription.current_period_start).toLocaleDateString(),
    nextBillingDate: subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : "N/A",
    vehicles: vehiclePricing,
    isFlock: vehiclesToDisplay.length > 1,
    hasVehicleData: vehicles.length > 0, // Whether we have actual vehicle data from DB
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
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

        {/* Subscription Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Subscription Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subscription Info */}
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

            {/* Plan Details */}
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
                <span className="text-sm">Base Price</span>
                <span className="font-medium">
                  ${orderData.basePrice.toFixed(2)}/{orderData.billingCycle}
                </span>
              </div>

              {/* Vehicles Section */}
              {orderData.vehicles.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <h4 className="text-sm font-medium">
                    {orderData.isFlock ? "Flock Vehicles" : "Vehicle"}
                    {!orderData.hasVehicleData && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Details loading...)
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2">
                    {orderData.vehicles.map((item, index: number) => (
                      <div
                        key={item.vehicle.id || index}
                        className="flex justify-between items-start p-2 bg-muted/50 rounded-md"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {item.displayName}
                            </span>
                            {item.isDiscounted && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                10% Flock Discount
                              </span>
                            )}
                          </div>
                          {item.vehicle.body_type && (
                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                              {item.vehicle.body_type}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {item.isDiscounted && (
                            <p className="text-xs text-muted-foreground line-through">
                              ${orderData.basePrice.toFixed(2)}
                            </p>
                          )}
                          <p className="text-sm font-semibold">
                            ${item.price.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">
                              /{orderData.billingCycle}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {orderData.isFlock && orderData.totalSavings > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm text-green-600 font-medium">
                        Total Flock Savings
                      </span>
                      <span className="text-sm font-semibold text-green-600">
                        -${orderData.totalSavings.toFixed(2)}/
                        {orderData.billingCycle}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Vehicle information is being processed. Please check back in a
                    moment.
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Billing Info */}
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
                <span>Total Amount Due Today</span>
                <span className="text-primary">
                  ${orderData.totalPrice.toFixed(2)}
                </span>
              </div>
              {orderData.isFlock && (
                <p className="text-xs text-muted-foreground text-right">
                  ${orderData.basePrice.toFixed(2)} base +{" "}
                  {orderData.vehicles.length - 1} vehicle(s) with 10% discount
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
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

        {/* Footer Message */}
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
