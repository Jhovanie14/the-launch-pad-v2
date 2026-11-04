"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import {
  getMyMarketingConsent,
  setMyMarketingConsent,
} from "@/app/(dashboard)/dashboard/settings/marketing-actions";

const DISMISSED_KEY = "marketing_prompt_dismissed_at";

/**
 * Asks an existing customer once whether they want product news. Shown only
 * when they are not subscribed and have not said "No thanks"; that answer is
 * kept on their account (auth metadata), so it holds on every device. The
 * permanent switch stays in Settings.
 */
export function MarketingOptInRow() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const dismissed = Boolean(user?.user_metadata?.[DISMISSED_KEY]);

  useEffect(() => {
    if (!user || dismissed) return;
    let active = true;
    getMyMarketingConsent()
      .then((subscribed) => active && setVisible(!subscribed))
      .catch(() => active && setVisible(false));
    return () => {
      active = false;
    };
  }, [user, dismissed]);

  if (!visible) return null;

  async function subscribe() {
    setSaving(true);
    try {
      const result = await setMyMarketingConsent(true);
      if (result.subscribed) {
        toast.success("You're subscribed to product news and offers.");
        setVisible(false);
      } else {
        toast.error("We couldn't subscribe this account. Please contact us.");
      }
    } catch {
      toast.error("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    setVisible(false);
    const { error } = await createClient().auth.updateUser({
      data: { [DISMISSED_KEY]: new Date().toISOString() },
    });
    if (error) console.error("[dashboard] could not save opt-in dismissal:", error);
  }

  return (
    <section
      aria-label="Product news and offers"
      className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div>
        <p className="font-bold text-slate-950">Want product news and offers?</p>
        <p className="text-sm text-slate-600">
          Occasional emails about new car-care products. Booking emails and receipts always come.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={subscribe}
          disabled={saving}
          className="min-h-11 rounded-lg bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
        >
          Yes, email me
        </button>
        <button
          type="button"
          onClick={dismiss}
          disabled={saving}
          className="min-h-11 rounded-lg px-4 font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-950"
        >
          No thanks
        </button>
      </div>
    </section>
  );
}
