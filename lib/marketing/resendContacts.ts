import { Resend } from "resend";

/**
 * Keeps a customer's Resend contact in step with our marketing consent, via a
 * single "Product news & offers" topic. These helpers never throw: a Resend
 * outage must not break signup, booking or settings. Callers get `false` and
 * leave the row unsynced for the daily re-sync cron.
 */

const LOG = "[marketing]";

export type TopicSubscription = "opt_in" | "opt_out";

type ResendResult = { error: unknown };

/** The slice of the Resend SDK these helpers use; tests pass fakes. */
export interface ResendContactsLike {
  contacts: {
    create(o: {
      email: string;
      firstName?: string;
      topics: { id: string; subscription: TopicSubscription }[];
      segments?: { id: string }[];
    }): Promise<ResendResult>;
    update(o: { email: string; unsubscribed: boolean }): Promise<ResendResult>;
    topics: {
      update(o: {
        email: string;
        topics: { id: string; subscription: TopicSubscription }[];
      }): Promise<ResendResult>;
      list(o: { email: string }): Promise<{
        data: { data: { id: string; subscription: TopicSubscription }[] } | null;
        error: unknown;
      }>;
    };
    segments: {
      add(o: { email: string; segmentId: string }): Promise<ResendResult>;
    };
  };
}

let client: Resend | null = null;

/** Lazily created so importing this module never needs the API key. */
export function getResend(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { statusCode?: number; name?: string };
  return e.statusCode === 404 || e.name === "not_found";
}

/**
 * Campaigns go out as Resend broadcasts, which must name a segment; the topic
 * then narrows it to people who opted in. So everyone who opts in is also put
 * in the campaign segment (RESEND_MARKETING_SEGMENT_ID). Opting out leaves
 * them in it: the topic opt-out is what stops campaigns.
 */
export interface SyncOptions {
  segmentId?: string;
}

export async function syncContactToResend(
  resend: ResendContactsLike,
  topicId: string | undefined,
  c: { email: string; firstName?: string | null; subscribed: boolean },
  opts: SyncOptions = {},
): Promise<boolean> {
  if (!topicId) {
    console.error(`${LOG} RESEND_MARKETING_TOPIC_ID is not set; contact not synced`);
    return false;
  }
  const subscription: TopicSubscription = c.subscribed ? "opt_in" : "opt_out";
  const topics = [{ id: topicId, subscription }];

  try {
    const { error } = await resend.contacts.topics.update({ email: c.email, topics });
    if (!error) {
      if (!c.subscribed) return true;
      // Opting in on our site is the customer's latest explicit choice, so it
      // also lifts an earlier "unsubscribe from everything" in Resend;
      // otherwise Resend would never deliver and its next contact.updated
      // event would flip our row back to unsubscribed.
      const cleared = await resend.contacts.update({ email: c.email, unsubscribed: false });
      if (cleared.error) {
        console.error(`${LOG} clearing global unsubscribe failed:`, cleared.error);
        return false;
      }
      await addToSegment(resend, c.email, opts.segmentId);
      return true;
    }
    if (!isNotFound(error)) {
      console.error(`${LOG} topic update failed:`, error);
      return false;
    }
    // No contact yet. Opting out someone Resend has never heard of is a no-op.
    if (!c.subscribed) return true;

    const created = await resend.contacts.create({
      email: c.email,
      ...(c.firstName ? { firstName: c.firstName } : {}),
      topics,
      ...(opts.segmentId ? { segments: [{ id: opts.segmentId }] } : {}),
    });
    if (created.error) {
      console.error(`${LOG} contact create failed:`, created.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`${LOG} Resend sync threw:`, err);
    return false;
  }
}

/**
 * Best effort: the consent itself is already saved in Resend (the topic), so a
 * failure here is logged, not retried. Already being in the segment is fine.
 */
async function addToSegment(resend: ResendContactsLike, email: string, segmentId: string | undefined) {
  if (!segmentId) return;
  try {
    const { error } = await resend.contacts.segments.add({ email, segmentId });
    if (error) console.error(`${LOG} adding contact to campaign segment failed:`, error);
  } catch (err) {
    console.error(`${LOG} adding contact to campaign segment threw:`, err);
  }
}

/** The contact's subscription to the topic, or null if unknown. */
export async function getTopicSubscription(
  resend: ResendContactsLike,
  topicId: string,
  email: string,
): Promise<TopicSubscription | null> {
  try {
    const { data, error } = await resend.contacts.topics.list({ email });
    if (error || !data) return null;
    return data.data.find((t) => t.id === topicId)?.subscription ?? null;
  } catch (err) {
    console.error(`${LOG} topic lookup threw:`, err);
    return null;
  }
}
