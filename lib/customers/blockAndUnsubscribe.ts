import type { SupabaseClient } from "@supabase/supabase-js";
import { recordConsent } from "@/lib/marketing/consent";
import { blockCustomer } from "./customerBlocks";

const LOG = "[customer-blocks]";

/**
 * What "Block Customer" does: block their email and plates, then unsubscribe
 * the email from marketing. A failed unsubscribe is logged and never undoes
 * the block. Unblocking does not re-subscribe them.
 *
 * Lives outside customerBlocks.ts because lib/marketing/consent imports that file.
 */
export async function blockAndUnsubscribe(
  db: SupabaseClient,
  userId: string,
  adminId: string,
  reason: string,
): Promise<{ email: string | null; plates: string[] }> {
  const { email, plates } = await blockCustomer(db, userId, adminId, reason);
  if (email) {
    try {
      await recordConsent(db, { email, action: "unsubscribe", source: "block" });
    } catch (consentError) {
      console.error(`${LOG} marketing unsubscribe failed:`, consentError);
    }
  }
  return { email, plates };
}

/**
 * The "Also block this customer" box on the admin cancel dialog, run after the
 * cancel succeeded. Never throws: the cancel can't be taken back, so a failed
 * block comes back as a warning for the admin rather than an error that reads
 * as if nothing happened.
 */
export async function blockAfterCancel(
  alsoBlock: boolean,
  db: SupabaseClient,
  userId: string,
  adminId: string,
  reason: string,
): Promise<{ blockedNote?: string; warning?: string }> {
  if (!alsoBlock) return {};
  try {
    const { email, plates } = await blockAndUnsubscribe(db, userId, adminId, reason);
    return { blockedNote: ` Also blocked: ${[email, ...plates].filter(Boolean).join(", ")}.` };
  } catch (err) {
    console.error(`${LOG} block after cancel failed:`, err);
    const why = err instanceof Error ? err.message : "Something went wrong.";
    return { warning: `The block failed: ${why} Use Block Customer to try again.` };
  }
}
