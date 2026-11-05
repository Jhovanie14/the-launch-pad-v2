"use client";

/*
  THESIS: The home is the customer's pass and their next move, not a stat board. It refuses the
  stock stat-card grid + "Welcome back" scaffold.
  OWN-WORLD: The logo's world (DESIGN.md, tokens in app/globals.css): navy night surfaces, the
  flame for the one primary action, one logo colour per service: sky (self-service), flame (express
  detailing), red (membership). Geist black weight for dates and plan names, plates drawn as real
  white plates in Geist Mono.
  STORY: A member sees they're covered and which cars, and can flash it at the bay; a booker sees
  their next detail or books again in one tap; a new customer meets the three services.
  FIRST VIEWPORT: Members: the membership pass fills the top (plan, Active-through, cars + plates,
  "Show at the bay"), the Now card under it. Others: the Now card leads. Phone: a bottom dock
  Book / Show at bay / Shop; desktop: "Book" lives in the navbar, the side column is the site card
  (hours, directions, shop), so no action is offered twice.
  FORM: Membership card + thumb dock, candidate 6 of 7, seed key 03bd3211.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
  verdict, and DESIGN.md
*/

import { useMemo, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import { useDashboardHome } from "@/hooks/useDashboardHome";
import HoursChangeDialog from "@/components/hours-change-dialog";
import { MemberPass, type MemberPassProps, type PassVehicle } from "@/components/dashboard-home/member-pass";
import { SiteStrip } from "@/components/dashboard-home/site-strip";
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

      <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">Hi, {firstName}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="space-y-6">
          {membershipLoading ? (
            <div aria-hidden className="h-64 animate-pulse rounded-2xl bg-dusk/90 motion-reduce:animate-none" />
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
            <div aria-hidden className="h-40 animate-pulse rounded-2xl bg-dusk/90 motion-reduce:animate-none" />
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

        <aside aria-label="Visit the site" className="lg:sticky lg:top-24">
          <SiteStrip />
        </aside>
      </div>

      {/* Last on every screen size: an ask, never in the way. */}
      <div className="mt-6 lg:max-w-[calc(100%-21.5rem)]">
        <MarketingOptInRow />
      </div>

      <ActionDock onBook={openBookingModal} onShowPass={isMember ? () => setBayOpen(true) : undefined} />
    </div>
  );
}


function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10">
      <p className="font-semibold">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 min-h-11 rounded-lg border border-white/25 px-4 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
      >
        Try again
      </button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your dashboard" className="space-y-6">
      <div className="h-8 w-40 animate-pulse rounded bg-line motion-reduce:animate-none" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <div className="h-64 animate-pulse rounded-2xl bg-dusk/90 motion-reduce:animate-none" />
          <div className="h-40 animate-pulse rounded-2xl bg-dusk/90 motion-reduce:animate-none" />
        </div>
        <div className="hidden h-48 animate-pulse rounded-2xl bg-line lg:block motion-reduce:animate-none" />
      </div>
    </div>
  );
}
