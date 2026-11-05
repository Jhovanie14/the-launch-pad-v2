"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getMyMarketingConsent,
  setMyMarketingConsent,
} from "@/app/(dashboard)/dashboard/settings/marketing-actions";

/**
 * The permanent product-news switch. The whole row is the target; until the
 * saved preference is known the switch is disabled, and if it can't be
 * loaded we say so rather than showing "off" as a guess.
 */
export function MarketingConsentSwitch() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadFailed(false);
    getMyMarketingConsent()
      .then((value) => active && setSubscribed(value))
      .catch(() => active && setLoadFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  async function handleChange(next: boolean) {
    setSaving(true);
    try {
      const result = await setMyMarketingConsent(next);
      setSubscribed(result.subscribed);
      if (result.blocked) {
        toast.error("We can't subscribe this account to emails. Please contact us.");
      } else {
        toast.success(
          result.subscribed
            ? "You're subscribed to product news and offers."
            : "You've unsubscribed from product news and offers.",
        );
      }
    } catch {
      toast.error("Couldn't save your email preference. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="marketing-consent" className="text-base font-semibold text-ink">
          Product news and offers
        </Label>
        <p className="max-w-prose text-sm text-ink-muted">
          Occasional emails about new car-care products and offers. Booking emails and receipts
          always come.
        </p>
        {loadFailed && (
          <p role="alert" className="flex flex-wrap items-center gap-x-2 text-sm text-ink">
            Couldn&apos;t load your current choice.
            <button
              type="button"
              onClick={load}
              className="min-h-11 rounded-lg px-2 font-semibold text-ink underline underline-offset-4 hover:bg-line-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Try again
            </button>
          </p>
        )}
      </div>
      {/* A 44px hit area around the small Radix switch. */}
      <label htmlFor="marketing-consent" className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
        <Switch
          id="marketing-consent"
          checked={subscribed}
          disabled={loading || saving || loadFailed}
          onCheckedChange={handleChange}
          aria-busy={loading || saving}
          className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
      </label>
    </div>
  );
}
