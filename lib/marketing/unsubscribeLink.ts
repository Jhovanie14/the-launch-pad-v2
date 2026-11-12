import type { SupabaseClient } from "@supabase/supabase-js";
import { recordConsent } from "./consent";
import { verifyUnsubscribeToken } from "./unsubscribeToken";

/**
 * The unsubscribe link in automatic marketing emails (the /unsubscribe page
 * and the one-click List-Unsubscribe POST). A valid link unsubscribes that one
 * address from news & offers, recorded with source "email_link".
 */
export async function unsubscribeByToken(
  db: SupabaseClient,
  token: string | null | undefined,
  secret: string | undefined,
  deps: { record?: typeof recordConsent } = {},
): Promise<{ ok: true; email: string } | { ok: false }> {
  const email = secret ? verifyUnsubscribeToken(token, secret) : null;
  if (!email) return { ok: false };
  await (deps.record ?? recordConsent)(db, { email, action: "unsubscribe", source: "email_link" });
  return { ok: true, email };
}

/** "samantha@example.com" → "sa••••••@example.com", for the confirmation page. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return email;
  const local = email.slice(0, at);
  const keep = local.length > 3 ? 2 : 1;
  return `${local.slice(0, keep)}${"•".repeat(local.length - keep)}${email.slice(at)}`;
}
