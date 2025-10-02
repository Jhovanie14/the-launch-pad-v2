"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubscriptionPlans } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { CheckCircle, Crown, DollarSign, Star, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function SubscriptionView() {
  const [loading, setLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlans[]
  >([]);
  const supabase = createClient();
  const fetchSubscription = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    setLoading(false);

    if (error) console.error(error);
    setSubscriptionPlans(data || []);

    console.log("all bookings", subscriptionPlans);
  }, [supabase]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

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
    <div className="flex-1 overflow-y-auto p-6">
      {/* Subscription Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Subscriptions
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {/* {activeSubscriptions} */}
                </p>
              </div>
              <Crown className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {/* ${totalSubscriptionRevenue.toFixed(2)} */}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-chart-1" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Churn Rate
                </p>
                <p className="text-2xl font-bold text-card-foreground">3.2%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-chart-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Subscription
                </p>
                <p className="text-2xl font-bold text-card-foreground">
                  {/* ${(totalSubscriptionRevenue / activeSubscriptions).toFixed(2)} */}
                </p>
              </div>
              <Star className="h-8 w-8 text-chart-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Plans */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Subscription Plans
            </CardTitle>
            <CardDescription>Available subscription options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subscriptionPlans.map((plan) => (
                <Card key={plan.id} className="bg-muted border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-card-foreground">
                          {plan.name}
                        </h3>
                        <p className="text-2xl font-bold text-accent">
                          {plan.month_price} {plan.yearly_price}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {/* per {plan.interval} */}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-card-foreground">
                          {plan.is_active} subscribers
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <p
                          key={index}
                          className="text-sm text-muted-foreground flex items-center"
                        >
                          <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                          {feature}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Subscription Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">
              Recent Activity
            </CardTitle>
            <CardDescription>Latest subscription changes</CardDescription>
          </CardHeader>
          <CardContent>
            {/* <div className="space-y-4">
              {customers
                .filter((c) => c.subscription)
                .slice(0, 6)
                .map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {customer.subscription?.status === "active" ? (
                          <Crown className="h-5 w-5 text-accent" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">
                          {customer.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {customer.subscription?.plan}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          customer.subscription?.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {customer.subscription?.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {customer.subscription?.price}
                      </p>
                    </div>
                  </div>
                ))}
            </div> */}
          </CardContent>
        </Card>
      </div>

      {/* All Subscribers */}
      <Card className="mt-6 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            All Subscribers
          </CardTitle>
          <CardDescription>
            Complete list of subscription customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* <div className="space-y-2">
            {customers
              .filter((c) => c.subscription)
              .map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {customer.subscription?.status === "active" ? (
                        <Crown className="h-4 w-4 text-accent" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground">
                        {customer.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.subscription?.plan}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-card-foreground">
                        {customer.subscription?.price}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {customer.subscription?.nextBilling
                          ? `Next: ${customer.subscription.nextBilling}`
                          : "Cancelled"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        customer.subscription?.status === "active"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {customer.subscription?.status}
                    </Badge>
                  </div>
                </div>
              ))}
          </div> */}
        </CardContent>
      </Card>
    </div>
  );
}
