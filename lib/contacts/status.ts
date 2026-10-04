// Contact-message statuses.
// new -> replied (reply flow). Staff can also file any message as spam or
// archived so it stops sitting in the inbox without needing a reply, and
// restore it later if it was filed by mistake.

export const CONTACT_STATUSES = ["new", "replied", "spam", "archived"] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const TRIAGE_ACTIONS = ["spam", "archive", "restore"] as const;

export type TriageAction = (typeof TRIAGE_ACTIONS)[number];

export function isTriageAction(value: unknown): value is TriageAction {
  return TRIAGE_ACTIONS.includes(value as TriageAction);
}

/**
 * Restore goes back to wherever the message would have been: a message that
 * was answered before being archived belongs under Replied, not back in New.
 */
export function statusForAction(
  action: TriageAction,
  contact: { status: string | null; replied_at: string | null }
): ContactStatus {
  switch (action) {
    case "spam":
      return "spam";
    case "archive":
      return "archived";
    case "restore":
      return contact.replied_at ? "replied" : "new";
  }
}
