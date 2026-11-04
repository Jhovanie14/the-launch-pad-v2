import type { ConsentStatus } from "./consent";
import type { TopicSubscription } from "./resendContacts";

/**
 * What a Resend contact event means for our consent table. The customer's
 * latest choice wins, wherever they made it:
 *  - deleted contact, a global unsubscribe, or a topic opt-out -> unsubscribe
 *  - a topic opt-in on Resend's preferences page -> subscribe
 * Returns null when Resend already matches us. That is also what stops our
 * own syncs (which trigger contact.updated) from looping back through here.
 * Contacts we have no row for are ignored: we never create consent from Resend.
 * While our own newer change is still waiting to reach Resend
 * (`ourChangePending`, i.e. resend_synced_at is null), Resend's opt-in state
 * may be stale, so a re-subscribe from Resend is ignored. An unsubscribe is
 * always honoured: it is never the wrong direction to err in.
 */
export function decideFromContactEvent(
  event: {
    type: "contact.updated" | "contact.deleted";
    data: { email: string; unsubscribed: boolean };
  },
  topic: TopicSubscription | null,
  current: ConsentStatus | null,
  ourChangePending = false,
): { action: "subscribe" | "unsubscribe"; source: "resend_unsubscribe" | "resend_preferences" } | null {
  if (!current) return null;

  const optedOut =
    event.type === "contact.deleted" || event.data.unsubscribed || topic === "opt_out";

  if (optedOut) {
    return current === "subscribed" ? { action: "unsubscribe", source: "resend_unsubscribe" } : null;
  }
  if (topic === "opt_in" && current === "unsubscribed" && !ourChangePending) {
    return { action: "subscribe", source: "resend_preferences" };
  }
  return null;
}
