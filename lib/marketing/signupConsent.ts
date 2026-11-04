import type { SupabaseClient } from "@supabase/supabase-js";
import { getConsentRow, recordConsent } from "./consent";

/**
 * Signup stores the marketing tick in the new user's metadata
 * (`marketing_opt_in: true`). It only counts once the email is confirmed, so
 * nobody can subscribe a stranger's address by signing it up. Called from
 * /auth/confirm after a successful verification.
 *
 * The flag is cleared once handled: /auth/confirm also handles password-reset
 * and magic links, and those must never re-subscribe someone who has since
 * unsubscribed. If the customer already made a choice after creating the
 * account (Settings, an unsubscribe link), that newer choice wins and the tick
 * is dropped. Never throws, so it can't break confirmation.
 */
export async function applySignupConsent(
  admin: SupabaseClient,
  user: {
    id: string;
    email?: string | null;
    created_at?: string | null;
    email_confirmed_at?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  deps: { record?: typeof recordConsent; getRow?: typeof getConsentRow } = {},
): Promise<void> {
  if (user.user_metadata?.marketing_opt_in !== true) return;
  if (!user.email || !user.email_confirmed_at) return;

  try {
    const existing = await (deps.getRow ?? getConsentRow)(admin, user.email);
    const newerChoiceExists =
      !!existing &&
      !!user.created_at &&
      new Date(existing.updated_at).getTime() > new Date(user.created_at).getTime();

    if (!newerChoiceExists) {
      const fullName = user.user_metadata?.full_name;
      const firstName =
        typeof fullName === "string" ? fullName.trim().split(/\s+/)[0] || null : null;

      await (deps.record ?? recordConsent)(admin, {
        email: user.email,
        userId: user.id,
        action: "subscribe",
        source: "signup",
        firstName,
      });
    }

    const { error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { marketing_opt_in: null },
    });
    if (error) console.error("[marketing] could not clear signup opt-in flag:", error);
  } catch (err) {
    console.error("[marketing] signup consent failed:", err);
  }
}
