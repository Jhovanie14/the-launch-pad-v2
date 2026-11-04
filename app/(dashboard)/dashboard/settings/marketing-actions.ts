"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { getConsentStatus, recordConsent } from "@/lib/marketing/consent";

// The settings switch for marketing email. Both actions act on the signed-in
// user's own auth email only; neither accepts an email from the browser, so
// nobody can read or change someone else's preference through them.

export async function getMyMarketingConsent(): Promise<boolean> {
  const user = await requireUser(await createClient());
  if (!user.email) return false;
  return (await getConsentStatus(createAdminClient(), user.email)) === "subscribed";
}

export async function setMyMarketingConsent(
  subscribed: boolean,
): Promise<{ subscribed: boolean; blocked: boolean }> {
  const user = await requireUser(await createClient());
  if (!user.email) return { subscribed: false, blocked: false };

  const fullName = user.user_metadata?.full_name;
  const firstName =
    typeof fullName === "string" ? fullName.trim().split(/\s+/)[0] || null : null;

  const { outcome } = await recordConsent(createAdminClient(), {
    email: user.email,
    userId: user.id,
    action: subscribed ? "subscribe" : "unsubscribe",
    source: "settings",
    firstName,
  });
  return { subscribed: outcome === "subscribed", blocked: outcome === "skipped_blocked" };
}
