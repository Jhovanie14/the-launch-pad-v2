"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Minus, Tag } from "lucide-react";
import LoadingDots from "@/components/loading";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";
import type { ServicePackageRow } from "@/types/db";
import { cn } from "@/lib/utils";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { applySale, isServiceFreeForDisplay } from "@/lib/booking/pricingDisplay";
import { bundleSuggestion, type BundleSuggestion } from "@/lib/booking/bundleSuggestion";
import VehiclePicker from "./VehiclePicker";
import AddOnList from "./AddOnList";
import AccountSheet from "./AccountSheet";
import BundleSheet from "./BundleSheet";
import StepLayout from "./ui/StepLayout";
import StepProgress from "./ui/StepProgress";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, SURFACE } from "./ui/focus";

const money = (n: number) => `$${n.toFixed(2)}`;
const SALE_PERCENT = Math.round(HOLIDAY_SALE_DISCOUNT * 100);

export default function ServiceStep({
  ctx,
  initial,
}: {
  ctx: BookingAuthContext;
  initial?: BookingInitialData;
}) {
  const router = useRouter();
  const { selection, loading, services, allAddOns, isVehicleSubscribed, planName, goToDateTime } =
    useBookingFlow(ctx, "service", initial);

  const [navigating, setNavigating] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(selection.serviceId);
  const [licensePlate, setLicensePlate] = useState(selection.licensePlate);
  const [showBanner, setShowBanner] = useState(!ctx.isAuthenticated);
  const [activeTab, setActiveTab] = useState<"quick" | "express">("quick");
  const [bundle, setBundle] = useState<BundleSuggestion | null>(null);

  // Keep selection in sync when the URL changes underneath us (e.g. the
  // dashboard booking modal navigates here with params).
  useEffect(() => {
    setLicensePlate(selection.licensePlate);
    if (selection.serviceId) setSelectedService(selection.serviceId);
  }, [selection.licensePlate, selection.serviceId]);

  const selectserv = services.find((s) => s.id === selectedService);

  const isServiceFree = (category: string | null) =>
    isServiceFreeForDisplay({ planName, isVehicleSubscribed, category });

  // Tab gating: a subscribed vehicle only sees the tabs its plan covers.
  const lowerPlan = planName?.toLowerCase() ?? "";
  const showQuickTab =
    !isVehicleSubscribed ||
    !planName ||
    !(lowerPlan.includes("express detail") || lowerPlan.includes("express") || lowerPlan.includes("commercial"));
  const showExpressTab = !isVehicleSubscribed || !planName || !lowerPlan.includes("exterior");

  const quickServices = services.filter((s) => s.category?.toLowerCase() === "quick service");
  const expressServices = services.filter((s) => s.category?.toLowerCase() === "express detail");

  // Auto-select the tab the subscription covers, or the URL-selected service's tab.
  useEffect(() => {
    if (isVehicleSubscribed && planName) {
      const lower = planName.toLowerCase();
      setActiveTab(
        lower.includes("express detail") || lower.includes("express") || lower.includes("commercial")
          ? "express"
          : "quick"
      );
      return;
    }
    if (selection.serviceId && services.length) {
      const svc = services.find((s) => s.id === selection.serviceId);
      const cat = svc?.category?.toLowerCase();
      if (cat === "express detail") setActiveTab("express");
      else if (cat === "quick service") setActiveTab("quick");
    }
  }, [isVehicleSubscribed, planName, selection.serviceId, services]);

  const toggleAddOn = (addOnId: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(addOnId) ? prev.filter((id) => id !== addOnId) : [...prev, addOnId]
    );
  };

  const navigate = (addOnIds: string[]) => {
    setNavigating(true);
    setAddOnOpen(false);
    setBundle(null);
    goToDateTime({ licensePlate, serviceId: selectedService, addOnIds });
  };

  // "Continue" in the extras sheet: offer the package only when it really
  // costs less (lib/booking/bundleSuggestion.ts), otherwise go on.
  const goNext = () => {
    if (selectserv && showExpressTab) {
      const suggestion = bundleSuggestion({
        chosen: { id: selectserv.id, price: Number(selectserv.price) },
        addOns: allAddOns
          .filter((a) => selectedAddOnIds.includes(a.id))
          .map((a) => ({ price: Number(a.price) })),
        catalog: services.map((s) => ({ id: s.id, name: s.name, price: Number(s.price), features: s.features })),
        isServiceFree: isServiceFree(selectserv.category),
      });
      if (suggestion) {
        setAddOnOpen(false);
        setBundle(suggestion);
        return;
      }
    }
    navigate(selectedAddOnIds);
  };

  const switchToBundle = () => {
    if (!bundle) return;
    setSelectedService(bundle.pkg.id);
    setActiveTab("express");
    setSelectedAddOnIds([]);
    setBundle(null);
  };

  const priceLine = (service: ServicePackageRow) => {
    const original = Number(service.price);
    if (isServiceFree(service.category)) {
      return (
        <span className="text-right">
          <span className="block text-base font-black text-svc-member-mark">Free</span>
          <span className="block text-xs text-ink-muted line-through">{money(original)}</span>
        </span>
      );
    }
    if (HOLIDAY_SALE_ACTIVE) {
      return (
        <span className="text-right">
          <span className="block text-xl font-black tracking-[-0.02em]">{money(applySale(original))}</span>
          <span className="block text-xs text-ink-muted line-through">{money(original)}</span>
        </span>
      );
    }
    return <span className="text-xl font-black tracking-[-0.02em]">{money(original)}</span>;
  };

  const renderServiceCard = (service: ServicePackageRow) => {
    const chosen = selectedService === service.id;
    return (
      <li key={service.id}>
        <button
          type="button"
          aria-pressed={chosen}
          onClick={() => setSelectedService(service.id)}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl bg-paper p-4 text-left transition-shadow motion-reduce:transition-none sm:p-5",
            chosen ? "ring-2 ring-night" : "ring-1 ring-line hover:ring-ink-subtle",
            FOCUS_ON_LIGHT
          )}
        >
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
              chosen ? "bg-night text-flame" : "ring-2 ring-inset ring-line"
            )}
          >
            {chosen && <Check className="size-4" strokeWidth={3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-lg font-black leading-tight tracking-[-0.02em]">{service.name}</span>
                <span className="mt-0.5 block text-sm text-ink-muted">{service.duration} min</span>
              </span>
              {priceLine(service)}
            </span>
            {!!service.features?.length && (
              <span className="mt-3 grid gap-1">
                {service.features.map((feature, i) => {
                  const missing = /^no\b/i.test(feature.trim());
                  return (
                    <span key={i} className={cn("flex items-start gap-2 text-sm", missing ? "text-ink-subtle" : "text-ink-muted")}>
                      {missing ? (
                        <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
                      ) : (
                        <Check className="mt-0.5 size-4 shrink-0 text-brand-blue" aria-hidden />
                      )}
                      <span>{feature}</span>
                    </span>
                  );
                })}
              </span>
            )}
          </span>
        </button>
      </li>
    );
  };

  const emptyNote = (kind: string) => (
    <p className={cn(SURFACE, "p-5 text-base text-ink-muted")}>No {kind} packages are available for your vehicle right now.</p>
  );

  if (loading || navigating) {
    return <LoadingDots />;
  }

  const summaryDetail = selectserv
    ? `${selectserv.duration} min · ${
        isServiceFree(selectserv.category) ? "Free with your membership" : money(applySale(Number(selectserv.price)))
      }`
    : undefined;

  const triggerClass =
    "h-11 rounded-lg text-base font-semibold text-ink-muted data-[state=active]:bg-night data-[state=active]:text-on-night data-[state=active]:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

  return (
    <>
      <StepLayout
        above={ctx.variant === "dashboard" ? <StepProgress current={1} tone="canvas" className="mb-5" /> : undefined}
        back={{ label: "Back", onClick: () => router.back() }}
        title="Choose your service"
        action={{
          summaryTitle: selectserv ? selectserv.name : "Choose a service",
          summaryDetail,
          button: (
            <button
              type="button"
              disabled={!selectserv}
              onClick={() => selectserv && setAddOnOpen(true)}
              className={FLAME_BUTTON}
            >
              Continue
            </button>
          ),
        }}
      >
        {HOLIDAY_SALE_ACTIVE && (
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
            <Tag className="size-4 shrink-0 text-svc-detail-mark" aria-hidden />
            Holiday sale: {SALE_PERCENT}% off all services. Prices shown include it.
          </p>
        )}

        {ctx.isAuthenticated ? (
          licensePlate && (
            <section aria-labelledby="your-car" className={cn(SURFACE, "p-4 sm:p-5")}>
              <h2 id="your-car" className="text-sm font-semibold text-ink-muted">
                Your car
              </h2>
              <LicensePlate plate={licensePlate} className="mt-2 px-3 py-1 text-base" />
            </section>
          )
        ) : (
          <VehiclePicker licensePlate={licensePlate} onChange={setLicensePlate} onSaved={() => {}} />
        )}

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "quick" | "express")} className="w-full gap-4">
          <TabsList
            className={cn(
              "grid h-auto w-full gap-1 rounded-xl bg-paper p-1 ring-1 ring-line",
              showQuickTab && showExpressTab ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            {showQuickTab && (
              <TabsTrigger value="quick" className={triggerClass}>
                Quick service
              </TabsTrigger>
            )}
            {showExpressTab && (
              <TabsTrigger value="express" className={triggerClass}>
                Express detail
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="quick" className="mt-0">
            {quickServices.length === 0 ? emptyNote("quick service") : <ul className="space-y-3">{quickServices.map(renderServiceCard)}</ul>}
          </TabsContent>
          <TabsContent value="express" className="mt-0">
            {expressServices.length === 0 ? emptyNote("express detail") : <ul className="space-y-3">{expressServices.map(renderServiceCard)}</ul>}
          </TabsContent>
        </Tabs>
      </StepLayout>

      {selectserv && (
        <AddOnList
          open={addOnOpen}
          onClose={() => setAddOnOpen(false)}
          service={selectserv}
          addOns={allAddOns}
          selectedIds={selectedAddOnIds}
          onToggle={toggleAddOn}
          serviceDisplayPrice={isServiceFree(selectserv.category) ? 0 : Number(selectserv.price)}
          isServiceFree={isServiceFree(selectserv.category)}
          onSkip={() => navigate([])}
          onNext={goNext}
        />
      )}

      <BundleSheet
        suggestion={bundle}
        onOpenChange={(open) => !open && setBundle(null)}
        onSwitch={switchToBundle}
        onKeep={() => navigate(selectedAddOnIds)}
      />

      <AccountSheet
        open={showBanner && !ctx.isAuthenticated}
        onOpenChange={(open) => !open && setShowBanner(false)}
        welcomeOffer={initial?.welcomeOffer ?? null}
      />
    </>
  );
}
