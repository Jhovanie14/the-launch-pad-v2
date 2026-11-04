"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getMyMarketingConsent,
  setMyMarketingConsent,
} from "@/app/(dashboard)/dashboard/settings/marketing-actions";

export function MarketingConsentSwitch() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getMyMarketingConsent()
      .then((value) => active && setSubscribed(value))
      .catch(() => active && toast.error("Couldn't load your email preferences."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleChange(next: boolean) {
    setSaving(true);
    try {
      const result = await setMyMarketingConsent(next);
      setSubscribed(result.subscribed);
      if (result.blocked) {
        toast.error("We can't subscribe this account. Please contact us.");
      } else {
        toast.success(
          result.subscribed
            ? "You're subscribed to product news and offers."
            : "You've unsubscribed from product news and offers.",
        );
      }
    } catch {
      toast.error("Couldn't update your email preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label htmlFor="marketing-consent">Product news and offers by email</Label>
        <p className="text-sm text-muted-foreground">
          Occasional emails about new products and offers. Booking emails and
          receipts are always sent.
        </p>
      </div>
      <Switch
        id="marketing-consent"
        checked={subscribed}
        disabled={loading || saving}
        onCheckedChange={handleChange}
      />
    </div>
  );
}
