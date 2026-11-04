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
    }): Promise<ResendResult>;
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

export async function syncContactToResend(
  resend: ResendContactsLike,
  topicId: string | undefined,
  c: { email: string; firstName?: string | null; subscribed: boolean },
): Promise<boolean> {
  if (!topicId) {
    console.error(`${LOG} RESEND_MARKETING_TOPIC_ID is not set; contact not synced`);
    return false;
  }
  const subscription: TopicSubscription = c.subscribed ? "opt_in" : "opt_out";
  const topics = [{ id: topicId, subscription }];

  try {
    const { error } = await resend.contacts.topics.update({ email: c.email, topics });
    if (!error) return true;
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
