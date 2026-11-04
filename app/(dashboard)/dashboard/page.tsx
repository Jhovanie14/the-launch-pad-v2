"use client";

/*
  THESIS: The home is the customer's pass and their next move, not a stat board. It refuses the
  stock stat-card grid + "Welcome back" scaffold.
  OWN-WORLD: The marketing site's world: slate-950 surfaces, amber-400 for the one primary action,
  service hues sky (self-service) / amber (express detailing) / violet (membership), Geist black
  weight for dates and plan names, plates drawn as real white plates in Geist Mono.
  STORY: A member sees they're covered and which cars, and can flash it at the bay; a booker sees
  their next detail or books again in one tap; a new customer meets the three services.
  FIRST VIEWPORT: Members: the membership pass fills the top (plan, Active-through, cars + plates,
  "Show at the bay"), the Now card under it. Others: the Now card leads. Phone: a bottom dock
  Book / Show at bay / Shop; desktop: a side rail with the same actions and the site strip.
  FORM: Membership card + thumb dock, candidate 6 of 7, seed key 03bd3211.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
  verdict, and DESIGN.md
*/

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarPlus, IdCard, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import { useDashboardHome } from "@/hooks/useDashboardHome";
import HoursChangeDialog from "@/components/hours-change-dialog";
import { MemberPass, type MemberPassProps, type PassVehicle } from "@/components/dashboard-home/member-pass";
import { NowCard } from "@/components/dashboard-home/now-card";
import { VisitsList } from "@/components/dashboard-home/visits-list";
import { ActionDock } from "@/components/dashboard-home/action-dock";
import { MarketingOptInRow } from "@/components/dashboard-home/marketing-opt-in-row";
import { buildPastVisits, membershipStatusLine, pickNow, vehicleLabel } from "@/lib/dashboard/home";

type PassData = Omit<MemberPassProps, "showing" | "onShowingChange">;

function toPassVehicles(
  vehicles: Array<{ id: string; year?: number | string | null; make?: string | null; model?: string | null; license_plate?: string | null; is_primary?: boolean }> = [],
): PassVehicle[] {
  return [...vehicles]
    .sort((a, b) => Number(!!b.is_primary) - Number(!!a.is_primary))
    .map((v) => ({
      id: v.id,
      label: vehicleLabel(v),
      plate: v.license_plate || null,
      isPrimary: !!v.is_primary,
    }));
}

export default function DashboardPage() {
  const { user, userProfile, isLoading } = useAuth();
  const { openBookingModal } = useBooking();
  const express = useSubscription();
  const selfService = useSelfServiceSubscription();
  const home = useDashboardHome();
  const [bayOpen, setBayOpen] = useState(false);
  const [now] = useState(() => new Date());

  const holderName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || "Member";
  const firstName = String(holderName).split(/\s+/)[0];

  const passes = useMemo(() => {
    const list: PassData[] = [];
    const ex = express.subscription;
    if (ex?.subscription_plans) {
      list.push({
        kind: "express",
        holderName,
        planName: ex.subscription_plans.name,
        description: ex.subscription_plans.description,
        statusLine: membershipStatusLine(ex),
        cancelling: ex.cancel_at_period_end,
        vehicles: toPassVehicles(ex.vehicles),
      });
    }
    const ss = selfService.subscription;
    if (ss?.subscription_plans) {
      list.push({
        kind: "self_service",
        holderName,
        planName: ss.subscription_plans.name,
        description: ss.subscription_plans.description,
        statusLine: membershipStatusLine(ss),
        cancelling: ss.cancel_at_period_end,
        vehicles: toPassVehicles(ss.vehicles),
      });
    }
    return list;
  }, [express.subscription, selfService.subscription, holderName]);

  const nowItem = useMemo(
    () => pickNow({ bookings: home.bookings, logs: home.logs, orders: home.orders, now }),
    [home.bookings, home.logs, home.orders, now],
  );
  const visits = useMemo(
    () => buildPastVisits({ bookings: home.bookings, logs: home.logs, orders: home.orders }),
    [home.bookings, home.logs, home.orders],
  );

  const membershipLoading = express.loading || selfService.loading;
  const membershipError = express.error || selfService.error;
  const isMember = passes.length > 0;
  const isNewCustomer =
    !home.loading && !home.error && home.bookings.length === 0 && home.logs.length === 0 && home.orders.length === 0;

  if (isLoading || !user) return <HomeSkeleton />;

  return (
    <div className="pb-28 lg:pb-0">
      {/* Mounted once the plan is known, so "Manage my plan" never pops into an open dialog. */}
      {!express.loading && (
        <HoursChangeDialog surface="dashboard" showPlanAction={!!express.subscription} />
      )}

      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Hi, {firstName}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
        <div className="space-y-6">
          {membershipLoading ? (
            <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-slate-900/90 motion-reduce:animate-none" />
          ) : membershipError ? (
            <InlineError
              message="Couldn't load your membership."
              onRetry={() => {
                express.refetch();
                selfService.reload();
              }}
            />
          ) : (
            passes.map((p, i) => (
              <MemberPass
                key={p.kind}
                {...p}
                {...(i === 0 ? { showing: bayOpen, onShowingChange: setBayOpen } : {})}
              />
            ))
          )}

          {/* Never guess: until we know their bookings and membership, show a placeholder;
              if bookings failed, say so instead of "nothing booked". */}
          {home.loading || membershipLoading ? (
            <div aria-hidden className="h-40 animate-pulse rounded-2xl bg-slate-900/90 motion-reduce:animate-none" />
          ) : home.error ? (
            <InlineError message="Couldn't load your bookings." onRetry={home.reload} />
          ) : (
            <NowCard
              now={nowItem}
              isMember={isMember}
              isNewCustomer={isNewCustomer && !membershipError}
              hasPass={isMember}
              onBook={openBookingModal}
            />
          )}

          {!isNewCustomer && (
            <VisitsList
              visits={visits}
              userId={user.id}
              reviewedIds={home.reviewedIds}
              onReviewed={home.markReviewed}
              error={home.error}
              onRetry={home.reload}
              now={now}
            />
          )}

        </div>

        <aside aria-label="Visit the site" className="space-y-4 lg:sticky lg:top-24">
          <div className="hidden space-y-2 rounded-2xl bg-slate-950 p-4 ring-1 ring-white/10 lg:block">
            <button
              type="button"
              onClick={openBookingModal}
              className="flex min-h-11 w-full items-center justify-between rounded-lg bg-amber-400 px-4 font-bold text-amber-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
            >
              <span className="flex items-center gap-2">
                <CalendarPlus aria-hidden className="size-4" /> Book a detail
              </span>
              <ArrowRight aria-hidden className="size-4" />
            </button>
            {isMember && (
              <button
                type="button"
                onClick={() => setBayOpen(true)}
                className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <IdCard aria-hidden className="size-4" /> Show at the bay
              </button>
            )}
            <Link
              href="/products"
              className="flex min-h-11 w-full items-center gap-2 rounded-lg px-4 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <ShoppingBag aria-hidden className="size-4" /> Shop car care
            </Link>
          </div>

          <SiteStrip />
        </aside>
      </div>

      {/* Last on every screen size: an ask, never in the way. */}
      <div className="mt-6 lg:max-w-[calc(100%-19.5rem)]">
        <MarketingOptInRow />
      </div>

      <ActionDock onBook={openBookingModal} onShowPass={isMember ? () => setBayOpen(true) : undefined} />
    </div>
  );
}

function SiteStrip() {
  return (
    <div className="rounded-2xl bg-white p-4 text-sm ring-1 ring-slate-200">
      <p className="font-semibold text-slate-950">10410 S Main St, Houston</p>
      <dl className="mt-2 space-y-1 text-slate-700">
        <div className="flex justify-between gap-3">
          <dt>Self-service bays</dt>
          <dd className="font-medium text-slate-950">Open 24/7</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt>Express detailing</dt>
          <dd className="font-medium text-slate-950">Thu–Sun, 9:30 AM–6:30 PM</dd>
        </div>
      </dl>
      <Link
        href="/terms"
        className="mt-3 inline-block rounded text-slate-700 underline underline-offset-4 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
      >
        Weather and closure policy
      </Link>
    </div>
  );
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-slate-950 p-5 text-white ring-1 ring-white/10">
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-11 rounded-lg border border-white/25 px-4 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
      >
        Try again
      </button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-900/90 motion-reduce:animate-none" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-900/90 motion-reduce:animate-none" />
        </div>
        <div className="hidden h-48 animate-pulse rounded-2xl bg-slate-200 lg:block motion-reduce:animate-none" />
      </div>
    </div>
  );
}
