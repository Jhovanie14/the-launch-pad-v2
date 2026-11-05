"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Check,
  CheckCircle2,
  Crown,
  Droplets,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useSubscription } from "@/hooks/useSubscription";
import { usePricingPlans } from "@/hooks/usePricingPlans";
import AuthPromptModal from "@/components/user/authPromptModal";
import PricingCard from "@/components/pricing-plan";
import { useSelfService } from "@/hooks/useSelfService";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab = "subscriptions" | "selfservice" | "fleet";

const FOCUS_LIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

const TEXT_LINK = cn(
  "rounded-sm font-semibold text-brand-blue underline underline-offset-4 hover:text-ink",
  FOCUS_LIGHT,
);

const FLAME_BUTTON = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

const SEGMENT = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink-muted transition-colors hover:text-ink sm:px-4",
  FOCUS_LIGHT,
);

export default function PricingPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { plans, loading, error } = usePricingPlans();

  const [activeTab, setActiveTab] = useState<Tab>("subscriptions");
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

  // What yearly billing saves, worked out from the plans themselves.
  const yearlySavings = useMemo(() => {
    const percents = plans
      .map((p) => {
        const twelveMonths = Number(p.monthly_price) * 12;
        const yearly = Number(p.yearly_price);
        return twelveMonths > 0 && yearly > 0
          ? Math.round(((twelveMonths - yearly) / twelveMonths) * 100)
          : 0;
      })
      .filter((n) => n > 0);
    if (percents.length === 0) return null;
    const max = Math.max(...percents);
    return max === Math.min(...percents) ? `Save ${max}%` : `Save up to ${max}%`;
  }, [plans]);

  if (loading || subscriptionLoading) {
    return <PricingSkeleton />;
  }

  const currentPlan = subscription?.subscription_plans?.name ?? null;
  const currentCycle = subscription?.billing_cycle === "year" ? "yearly" : "monthly";

  return (
    <div>
      <header className="max-w-2xl">
        <h1 className="text-3xl font-black tracking-tight text-balance text-ink">
          Membership
        </h1>
        {currentPlan ? (
          <p className="mt-2 text-base leading-relaxed text-ink-muted">
            You&apos;re on{" "}
            <span className="font-semibold text-ink">{currentPlan}</span>, billed{" "}
            {currentCycle}. Choose another plan below to upgrade, or{" "}
            <Link href="/dashboard/billing" className={TEXT_LINK}>
              manage it in Billing
            </Link>
            .
          </p>
        ) : (
          <p className="mt-2 text-base leading-relaxed text-ink-muted">
            {userProfile?.full_name
              ? `${String(userProfile.full_name).split(/\s+/)[0]}, choose a plan`
              : "Choose a plan"}
            , then add your vehicles and review the total before you pay.
          </p>
        )}
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Tab)}
        className="mt-6 gap-6"
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-paper p-1 ring-1 ring-line sm:w-fit">
          <TabsTrigger value="subscriptions" className={TAB_TRIGGER}>
            <Crown aria-hidden className="size-4 text-svc-member-mark" />
            Membership
          </TabsTrigger>
          <TabsTrigger value="selfservice" className={TAB_TRIGGER}>
            <Droplets aria-hidden className="size-4 text-svc-self-mark" />
            Self-service
          </TabsTrigger>
          <TabsTrigger value="fleet" className={TAB_TRIGGER}>
            <Building2 aria-hidden className="size-4" />
            Fleet
          </TabsTrigger>
        </TabsList>

        {/* Express membership plans */}
        <TabsContent value="subscriptions" className="space-y-6">
          <h2 className="sr-only">Express membership plans</h2>
          {error ? (
            <LoadError message="Couldn't load the membership plans." />
          ) : plans.length === 0 ? (
            <EmptyPanel>
              No membership plans are open to join right now. Call us on{" "}
              <a href="tel:+18322198320" className={TEXT_LINK}>
                (832) 219-8320
              </a>{" "}
              and we&apos;ll help.
            </EmptyPanel>
          ) : (
            <>
              <PricingToggle
                pricing={pricing}
                setPricing={setPricing}
                yearlySavings={yearlySavings}
              />
              <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <PricingCard
                    key={plan.id}
                    plan={plan}
                    pricing={pricing}
                    subscription={subscription}
                    handleCheckout={handleCheckout}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="selfservice">
          <SelfServiceSection user={user} />
        </TabsContent>

        <TabsContent value="fleet">
          <FleetServicesSection user={user} userProfile={userProfile} />
        </TabsContent>
      </Tabs>

      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

const TAB_TRIGGER = cn(
  "min-h-11 flex-1 rounded-lg px-3 text-sm font-semibold text-ink-muted shadow-none hover:text-ink sm:flex-none sm:px-4",
  "data-[state=active]:bg-night data-[state=active]:text-on-night data-[state=active]:shadow-none",
  "focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
);

/* ------------------------- Components ------------------------- */

function PricingToggle({
  pricing,
  setPricing,
  yearlySavings,
}: {
  pricing: "monthly" | "yearly";
  setPricing: (value: "monthly" | "yearly") => void;
  yearlySavings: string | null;
}) {
  return (
    <div
      role="group"
      aria-label="Billing period"
      className="inline-flex rounded-xl bg-paper p-1 ring-1 ring-line"
    >
      {(["monthly", "yearly"] as const).map((type) => (
        <button
          key={type}
          type="button"
          aria-pressed={pricing === type}
          onClick={() => setPricing(type)}
          className={cn(
            SEGMENT,
            "group aria-pressed:bg-night aria-pressed:text-on-night",
          )}
        >
          {type === "monthly" ? "Monthly" : "Yearly"}
          {type === "yearly" && yearlySavings && (
            <span className="text-xs font-semibold text-ink-muted group-aria-pressed:text-on-night-muted">
              {yearlySavings}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function SelfServiceSection({ user }: { user: any }) {
  const router = useRouter();
  const { plan, subscription, usedToday, loading } = useSelfService(user);

  const pricingObj = "monthly";
  const handleCheckout = () => {
    router.push("/dashboard/pricing/self-service-cart");
  };

  if (!user) {
    return (
      <EmptyPanel>
        <Link href="/login" className={TEXT_LINK}>
          Sign in
        </Link>{" "}
        to see the self-service plan.
      </EmptyPanel>
    );
  }

  if (loading) {
    return (
      <div aria-busy="true" aria-label="Loading the self-service plan" className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="h-[28rem] animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
      </div>
    );
  }

  if (!plan) {
    return <LoadError message="Couldn't load the self-service plan." />;
  }

  const startedAt = subscription?.started_at ? new Date(subscription.started_at) : null;
  const status = String(subscription?.status ?? "");
  const isActive = status === "active";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <h2 className="sr-only">Self-service plan</h2>
      <PricingCard
        plan={plan}
        pricing={pricingObj}
        subscription={subscription}
        handleCheckout={handleCheckout}
      />

      {subscription ? (
        <section
          aria-labelledby="ss-yours"
          className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
        >
          <h3 id="ss-yours" className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
            <Droplets aria-hidden className="size-5 text-svc-self-mark" />
            Your self-service plan
          </h3>
          <dl className="mt-4 divide-y divide-line-soft border-y border-line-soft text-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-muted">Status</dt>
              <dd className="flex items-center gap-1.5 font-semibold text-ink">
                {isActive ? (
                  <CheckCircle2 aria-hidden className="size-4 text-brand-blue" />
                ) : (
                  <Info aria-hidden className="size-4 text-ink-subtle" />
                )}
                <span className="capitalize">{status.replace(/_/g, " ") || "Unknown"}</span>
              </dd>
            </div>
            {startedAt && !Number.isNaN(startedAt.getTime()) && (
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-ink-muted">Started</dt>
                <dd className="font-semibold text-ink">
                  {startedAt.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-ink-muted">Today</dt>
              <dd className="font-semibold text-ink">
                {usedToday ? "Used today" : "Not used yet today"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={() => router.push("/dashboard/self-service-log")}
            className={cn(
              "mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas sm:w-auto",
              FOCUS_LIGHT,
            )}
          >
            Log a bay visit
          </button>
        </section>
      ) : (
        <section
          aria-labelledby="ss-about"
          className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
        >
          <h3 id="ss-about" className="flex items-center gap-2 text-xl font-black tracking-tight text-ink">
            <Droplets aria-hidden className="size-5 text-svc-self-mark" />
            Self-service bays
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">
            The bays at 10410 S Main St are open 24/7. Join the plan, add the
            license plate of the car you&apos;ll bring, and log each bay visit
            from your phone.
          </p>
        </section>
      )}
    </div>
  );
}

const FLEET_BENEFITS = [
  "Volume-based pricing discounts",
  "Dedicated account manager",
  "Priority scheduling",
  "Monthly invoicing options",
  "Custom service packages",
  "Fleet reporting & analytics",
  "On-site service available",
];

const FLEET_IDEAL_FOR = [
  "Delivery & logistics companies",
  "Taxi & rideshare fleets",
  "Corporate vehicle fleets",
  "Rental car companies",
  "Municipal vehicles",
  "Construction companies",
  "Service businesses with 5+ vehicles",
];

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
      const response = await fetch("/api/admin/fleet-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit inquiry");

      toast.success("Thanks, we've got your request", {
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
    } catch {
      toast.error("Couldn't send your request", {
        description: "Please try again, or call us on (832) 219-8320.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div>
        <h2 className="text-xl font-black tracking-tight text-ink sm:text-2xl">
          Fleet services for businesses
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted sm:text-base">
          Custom plans for companies with several vehicles: volume discounts,
          one account manager and flexible billing.
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div>
            <h3 className="text-base font-bold text-ink">What you get</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink">
              {FLEET_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-blue" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">A good fit for</h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink">
              {FLEET_IDEAL_FOR.map((ideal) => (
                <li key={ideal} className="flex items-start gap-2">
                  <Building2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
                  <span>{ideal}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section
        aria-labelledby="fleet-quote"
        className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
      >
        <h3 id="fleet-quote" className="text-xl font-black tracking-tight text-ink">
          Request a fleet quote
        </h3>
        <p className="mt-1 text-sm text-ink-muted">
          We&apos;ll contact you within 24 hours. All fields are required.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="fleet-company" label="Company name" icon={Building2}>
              <Input
                id="fleet-company"
                required
                autoComplete="organization"
                placeholder="Your company"
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                className={INPUT_WITH_ICON}
              />
            </Field>

            <Field id="fleet-contact" label="Contact name" icon={User}>
              <Input
                id="fleet-contact"
                required
                autoComplete="name"
                placeholder="Jane Doe"
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                className={INPUT_WITH_ICON}
              />
            </Field>

            <Field id="fleet-email" label="Email" icon={Mail}>
              <Input
                id="fleet-email"
                required
                type="email"
                autoComplete="email"
                placeholder="jane@company.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={INPUT_WITH_ICON}
              />
            </Field>

            <Field id="fleet-phone" label="Phone" icon={Phone}>
              <Input
                id="fleet-phone"
                required
                type="tel"
                autoComplete="tel"
                placeholder="(555) 000-0000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className={INPUT_WITH_ICON}
              />
            </Field>
          </div>

          <Field id="fleet-size" label="Number of vehicles">
            <Input
              id="fleet-size"
              required
              placeholder="For example, 10–20"
              value={formData.fleet_size}
              onChange={(e) =>
                setFormData({ ...formData, fleet_size: e.target.value })
              }
              className="h-11"
            />
          </Field>

          <Field id="fleet-message" label="What do you need?" icon={MessageSquare} iconTop>
            <Textarea
              id="fleet-message"
              required
              placeholder="How often your vehicles need cleaning, what types they are, and anything else we should know."
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              className="min-h-32 pl-10"
            />
          </Field>

          <button
            type="submit"
            disabled={submitting}
            className={cn(FLAME_BUTTON, "min-h-12 w-full")}
          >
            {submitting && (
              <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            )}
            {submitting ? "Sending your request…" : "Request a fleet quote"}
          </button>
        </form>
      </section>
    </div>
  );
}

const INPUT_WITH_ICON = "h-11 pl-10";

function Field({
  id,
  label,
  icon: Icon,
  iconTop,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-3 size-4 text-ink-subtle",
              iconTop ? "top-3" : "top-1/2 -translate-y-1/2",
            )}
          />
        )}
        {children}
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-paper p-5 text-base text-ink-muted ring-1 ring-line sm:p-7">
      <p className="max-w-prose">{children}</p>
    </div>
  );
}

function LoadError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10 sm:p-7">
      <p className="font-semibold">{message}</p>
      <p className="mt-1 text-sm text-on-night-muted">
        Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 min-h-11 rounded-lg border border-white/25 px-4 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
      >
        Try again
      </button>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading membership plans" className="space-y-6">
      <div className="h-9 w-48 animate-pulse rounded bg-line motion-reduce:animate-none" />
      <div className="h-5 w-full max-w-md animate-pulse rounded bg-line motion-reduce:animate-none" />
      <div className="h-12 w-full max-w-sm animate-pulse rounded-xl bg-line motion-reduce:animate-none" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[28rem] animate-pulse rounded-2xl bg-line motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
