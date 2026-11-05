"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useSelfServiceSubscription } from "@/hooks/useSelfServiceSubscription";
import SubscriptionStatus from "@/components/subscription-status";
import SubscriptionCancelInfo from "@/components/user/subscription-cancel-info";
import SelfServiceSubscriptionStatus from "@/components/self-service-subscription-status";

const QUIET_LINK =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-ink hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/*
  Billing: one place for what you pay and what it covers. Each plan is one
  white card holding status, the next charge, the payment method and the
  vehicles on it, with cancelling last. The navbar's Membership tab is where
  plans are compared; this page links there instead of repeating it.
*/
export default function BillingPage() {
  const { subscription, loading, error, refetch } = useSubscription();
  const {
    subscription: selfSubs,
    loading: selfLoading,
    error: selfError,
    reload: reloadSelfSubs,
  } = useSelfServiceSubscription();

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Billing</h1>
      <p className="mt-1 text-ink-muted">
        What you pay, when, and which vehicles it covers.
      </p>

      {loading || selfLoading ? (
        <BillingSkeleton />
      ) : error ? (
        <div className="mt-8">
          <InlineError
            message="We couldn't load your membership."
            detail="Your plan hasn't changed. This is a problem loading the page."
            onRetry={() => {
              refetch();
              reloadSelfSubs();
            }}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
          <div className="space-y-10">
          <section aria-labelledby="express-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <h2 id="express-heading" className="text-xl font-black tracking-tight text-ink">
                Express detailing membership
              </h2>
              {subscription && (
                <Link href="/dashboard/pricing" className={cn(QUIET_LINK, "-mr-3")}>
                  Change plan
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
            </div>
            {subscription && <SubscriptionCancelInfo subscription={subscription} />}
            <SubscriptionStatus subscription={subscription} onVehicleChange={refetch} />
          </section>

          {selfError ? (
            <section aria-labelledby="self-heading" className="space-y-4">
              <h2 id="self-heading" className="text-xl font-black tracking-tight text-ink">
                Self-service plan
              </h2>
              <InlineError
                message="We couldn't load your self-service plan."
                onRetry={reloadSelfSubs}
              />
            </section>
          ) : (
            selfSubs && (
              <section aria-labelledby="self-heading" className="space-y-4">
                <h2 id="self-heading" className="text-xl font-black tracking-tight text-ink">
                  Self-service plan
                </h2>
                <SelfServiceSubscriptionStatus
                  subscription={selfSubs}
                  onSubscriptionChange={reloadSelfSubs}
                />
              </section>
            )
          )}

          </div>

          <aside
            aria-labelledby="billing-help"
            className="rounded-2xl bg-paper p-5 ring-1 ring-line lg:sticky lg:top-24"
          >
            <h2 id="billing-help" className="text-base font-black tracking-tight text-ink">
              Questions about a charge?
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Send us a message and we&apos;ll reply by email, or give us a call.
            </p>
            <div className="mt-3 -mx-2 border-t border-line-soft pt-2">
              <Link href="/dashboard/help" className={cn(QUIET_LINK, "flex px-2")}>
                <MessageSquare aria-hidden className="size-4 text-brand-blue" />
                Contact support
              </Link>
              <a href="tel:+18322198320" className={cn(QUIET_LINK, "flex px-2")}>
                <Phone aria-hidden className="size-4 text-brand-blue" />
                (832) 219-8320
              </a>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function InlineError({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-2xl bg-night p-5 text-on-night ring-1 ring-white/10 sm:p-7">
      <p className="font-semibold">{message}</p>
      {detail && <p className="mt-1 text-sm text-on-night-muted">{detail}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 min-h-11 rounded-lg border border-white/25 px-4 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
      >
        Try again
      </button>
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your billing" className="mt-8 space-y-4">
      <div className="h-7 w-64 animate-pulse rounded bg-line motion-reduce:animate-none" />
      <div className="space-y-5 rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
        <div className="h-8 w-56 animate-pulse rounded bg-line motion-reduce:animate-none" />
        <div className="h-5 w-48 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
        <div className="h-px bg-line-soft" />
        <div className="h-10 w-36 animate-pulse rounded bg-line motion-reduce:animate-none" />
        <div className="space-y-2">
          <div className="h-5 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
          <div className="h-5 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
        </div>
        <div className="h-px bg-line-soft" />
        <div className="h-14 animate-pulse rounded bg-line-soft motion-reduce:animate-none" />
      </div>
    </div>
  );
}
