import type { SupabaseClient } from "@supabase/supabase-js";
import { findCustomerBlock } from "@/lib/customers/customerBlocks";
import { getResend, syncContactToResend } from "./resendContacts";

/**
 * The ONLY writer of public.marketing_consents (marketing email consent).
 *
 * Rules (docs/superpowers/specs/2026-11-05-marketing-consent-design.md):
 *  - An unticked checkbox must never call this. Leaving a box unticked is
 *    "no change", never "unsubscribe": otherwise anyone could unsubscribe a
 *    customer by booking with their email.
 *  - Blocked emails are never subscribed.
 *  - A Resend failure never fails the caller; the row stays unsynced
 *    (resend_synced_at null) for the daily re-sync cron.
 */

export type ConsentSource =
  | "signup"
  | "booking"
  | "settings"
  | "resend_unsubscribe"
  | "resend_preferences"
  | "block";

export type ConsentStatus = "subscribed" | "unsubscribed";

export interface RecordConsentInput {
  email: string;
  userId?: string | null;
  action: "subscribe" | "unsubscribe";
  source: ConsentSource;
  firstName?: string | null;
}

export interface RecordConsentResult {
  outcome: ConsentStatus | "skipped_blocked" | "skipped_invalid";
  synced: boolean;
}

type SyncFn = (c: { email: string; firstName?: string | null; subscribed: boolean }) => Promise<boolean>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultSync: SyncFn = (c) =>
  syncContactToResend(getResend(), process.env.RESEND_MARKETING_TOPIC_ID, c, {
    segmentId: process.env.RESEND_MARKETING_SEGMENT_ID,
  });

export async function recordConsent(
  db: SupabaseClient,
  input: RecordConsentInput,
  deps: { sync?: SyncFn } = {},
): Promise<RecordConsentResult> {
  const email = input.email?.trim() ?? "";
  if (!EMAIL_RE.test(email)) return { outcome: "skipped_invalid", synced: false };

  const subscribed = input.action === "subscribe";
  if (subscribed && (await findCustomerBlock(db, { email }))) {
    return { outcome: "skipped_blocked", synced: false };
  }

  // One person = one row = one Resend contact. Resend keys contacts by the
  // literal address, so keep the spelling we first stored (e.g. a later
  // "John.Doe@gmail.com" stays "johndoe@gmail.com"); otherwise an unsubscribe
  // could reach only one of two contacts for the same inbox.
  const existing = await getConsentRow(db, email);
  const canonicalEmail = existing?.email ?? email;

  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    email: canonicalEmail,
    status: subscribed ? "subscribed" : "unsubscribed",
    source: input.source,
    updated_at: now,
    resend_synced_at: null,
    ...(subscribed ? { subscribed_at: now } : { unsubscribed_at: now }),
    // Omitted rather than null, so a guest booking never unlinks an account.
    ...(input.userId ? { user_id: input.userId } : {}),
  };

  const { data, error } = await db
    .from("marketing_consents")
    .upsert(row, { onConflict: "normalized_email" })
    .select("id")
    .single();
  if (error) throw error;

  const outcome: ConsentStatus = subscribed ? "subscribed" : "unsubscribed";
  let synced = false;
  try {
    synced = await (deps.sync ?? defaultSync)({
      email: canonicalEmail,
      firstName: input.firstName,
      subscribed,
    });
  } catch (err) {
    console.error("[marketing] Resend sync threw:", err);
  }

  if (synced && data?.id) {
    const { error: stampError } = await db
      .from("marketing_consents")
      .update({ resend_synced_at: new Date().toISOString() })
      .eq("id", data.id);
    if (stampError) {
      console.error("[marketing] could not stamp resend_synced_at:", stampError);
      synced = false;
    }
  }

  return { outcome, synced };
}

export interface ConsentRow {
  id: string;
  email: string;
  status: ConsentStatus;
  updated_at: string;
  resend_synced_at: string | null;
}

/** The stored row for this email (normalized like customer_blocks), or null. Throws on DB errors. */
export async function getConsentRow(db: SupabaseClient, email: string): Promise<ConsentRow | null> {
  const trimmed = email?.trim() ?? "";
  if (!trimmed) return null;

  const { data: normalized, error: normError } = await db.rpc("normalize_block_email", {
    p_email: trimmed,
  });
  if (normError) throw normError;
  if (!normalized) return null;

  const { data, error } = await db
    .from("marketing_consents")
    .select("id, email, status, updated_at, resend_synced_at")
    .eq("normalized_email", normalized as string)
    .maybeSingle();
  if (error) throw error;
  return (data as ConsentRow | null) ?? null;
}

/** The stored consent status for this email, or null. */
export async function getConsentStatus(
  db: SupabaseClient,
  email: string,
): Promise<ConsentStatus | null> {
  return (await getConsentRow(db, email))?.status ?? null;
}
