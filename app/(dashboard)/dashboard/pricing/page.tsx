"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Building2,
  Mail,
  Phone,
  User,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import AuthPromptModal from "@/components/user/authPromptModal";
import PricingCard from "@/components/pricing-plan";
import LoadingDots from "@/components/loading";
import { useSelfService } from "@/hooks/useSelfService";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export default function PricingPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { subscription } = useSubscription();
  const { plans, loading } = usePricingPlans();

  const [activeTab, setActiveTab] = useState<
    "subscriptions" | "selfservice" | "fleet"
  >("subscriptions");

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
        {activeTab === "subscriptions" && (
          <PricingToggle pricing={pricing} setPricing={setPricing} />
        )}
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

      {/* TAB: Fleet Services */}
      {activeTab === "fleet" && (
        <FleetServicesSection user={user} userProfile={userProfile} />
      )}

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
  setActiveTab: (t: "subscriptions" | "selfservice" | "fleet") => void;
}) {
  return (
    <div className="flex justify-center mb-10">
      <div className="bg-gray-100 p-1 rounded-lg inline-flex flex-wrap gap-1">
        {["subscriptions", "selfservice", "fleet"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2 rounded-md transition-colors ${
              activeTab === tab
                ? "bg-white text-blue-900 shadow-sm"
                : "text-gray-600 hover:text-blue-900"
            }`}
          >
            {tab === "subscriptions"
              ? "Carwash Plans"
              : tab === "selfservice"
                ? "Self-Service Bay"
                : "Fleet Services"}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelfServiceSection({ user }: { user: any }) {
  const router = useRouter();
  const { plan, subscription, usedToday, loading } = useSelfService(user);

  const pricingObj = "monthly";
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
        subscription={subscription}
        handleCheckout={handleCheckout}
      />

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

function FleetServicesSection({
  user,
  userProfile,
}: {
  user: any;
  userProfile: any;
}) {
  const [formData, setFormData] = useState({
    company_name: "",
    contact_name: userProfile?.full_name || "",
    email: user?.email || "",
    phone: "",
    fleet_size: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/fleet-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit inquiry");

      toast.success("Inquiry Submitted!", {
        description:
          "We'll contact you within 24 hours to discuss your fleet needs.",
      });

      setFormData({
        company_name: "",
        contact_name: userProfile?.full_name || "",
        email: user?.email || "",
        phone: "",
        fleet_size: "",
        message: "",
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to submit inquiry. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="text-center mb-12">
        <Building2 className="w-16 h-16 text-blue-900 mx-auto mb-4" />
        <h2 className="text-4xl font-semibold text-blue-900 mb-4">
          Fleet Services for Businesses
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Custom solutions for companies with multiple vehicles. Get volume
          discounts, dedicated account management, and flexible billing options.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Fleet Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                "Volume-based pricing discounts",
                "Dedicated account manager",
                "Priority scheduling",
                "Monthly invoicing options",
                "Custom service packages",
                "Fleet reporting & analytics",
                "On-site service available",
              ].map((benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Crown className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Ideal For</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {[
                "Delivery & logistics companies",
                "Taxi & rideshare fleets",
                "Corporate vehicle fleets",
                "Rental car companies",
                "Municipal vehicles",
                "Construction companies",
                "Service businesses with 5+ vehicles",
              ].map((ideal, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Building2 className="w-5 h-5 text-blue-900 shrink-0 mt-0.5" />
                  <span>{ideal}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-900/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Request a Fleet Quote</CardTitle>
          <CardDescription>
            Fill out the form below and our team will contact you within 24
            hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    required
                    placeholder="Your Company"
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData({ ...formData, company_name: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contact Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    required
                    placeholder="John Doe"
                    value={formData.contact_name}
                    onChange={(e) =>
                      setFormData({ ...formData, contact_name: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    required
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    required
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fleet Size *</label>
              <Input
                required
                placeholder="Number of vehicles (e.g., 10-20)"
                value={formData.fleet_size}
                onChange={(e) =>
                  setFormData({ ...formData, fleet_size: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message *</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  required
                  placeholder="Tell us about your fleet needs, service frequency preferences, and any specific requirements..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="pl-10 min-h-32"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-6 text-lg"
            >
              {submitting ? "Submitting..." : "Request Fleet Quote"}
            </Button>
          </form>
        </CardContent>
      </Card>
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
