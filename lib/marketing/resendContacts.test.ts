import { describe, expect, it, vi } from "vitest";
import {
  getTopicSubscription,
  syncContactToResend,
  type ResendContactsLike,
} from "./resendContacts";

const TOPIC = "topic_1";
const EMAIL = "sam@example.com";

function fakeResend(opts: {
  update?: () => Promise<{ error: unknown }>;
  create?: () => Promise<{ error: unknown }>;
  contactUpdate?: () => Promise<{ error: unknown }>;
  list?: () => Promise<{ data: { data: { id: string; subscription: "opt_in" | "opt_out" }[] } | null; error: unknown }>;
} = {}) {
  const update = vi.fn(opts.update ?? (async () => ({ error: null })));
  const create = vi.fn(opts.create ?? (async () => ({ error: null })));
  const list = vi.fn(opts.list ?? (async () => ({ data: { data: [] }, error: null })));
  const contactUpdate = vi.fn(opts.contactUpdate ?? (async () => ({ error: null })));
  const resend = { contacts: { create, update: contactUpdate, topics: { update, list } } } as unknown as ResendContactsLike;
  return { resend, update, create, list, contactUpdate };
}

const notFound = async () => ({ error: { statusCode: 404, name: "not_found", message: "Contact not found" } });

describe("syncContactToResend", () => {
  it("updates the topic to opt_in for an existing contact", async () => {
    const { resend, update, create } = fakeResend();
    const ok = await syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: true });
    expect(ok).toBe(true);
    expect(update).toHaveBeenCalledWith({ email: EMAIL, topics: [{ id: TOPIC, subscription: "opt_in" }] });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates the contact opted in when it does not exist", async () => {
    const { resend, create } = fakeResend({ update: notFound });
    const ok = await syncContactToResend(resend, TOPIC, { email: EMAIL, firstName: "Sam", subscribed: true });
    expect(ok).toBe(true);
    expect(create).toHaveBeenCalledWith({
      email: EMAIL,
      firstName: "Sam",
      topics: [{ id: TOPIC, subscription: "opt_in" }],
    });
  });

  it("clears a global unsubscribe when the customer opts in again", async () => {
    const { resend, contactUpdate } = fakeResend();
    const ok = await syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: true });
    expect(ok).toBe(true);
    expect(contactUpdate).toHaveBeenCalledWith({ email: EMAIL, unsubscribed: false });
  });

  it("leaves the global unsubscribe alone when opting out", async () => {
    const { resend, contactUpdate } = fakeResend();
    await syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: false });
    expect(contactUpdate).not.toHaveBeenCalled();
  });

  it("reports failure when clearing the global unsubscribe fails", async () => {
    const { resend } = fakeResend({ contactUpdate: async () => ({ error: { statusCode: 500 } }) });
    await expect(syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: true })).resolves.toBe(false);
  });

  it("does not create a contact just to opt it out", async () => {
    const { resend, create } = fakeResend({ update: notFound });
    const ok = await syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: false });
    expect(ok).toBe(true);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns false instead of throwing when Resend fails", async () => {
    const { resend } = fakeResend({
      update: async () => {
        throw new Error("network");
      },
    });
    await expect(syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: true })).resolves.toBe(false);
  });

  it("returns false when Resend reports a non-404 error", async () => {
    const { resend, create } = fakeResend({ update: async () => ({ error: { statusCode: 500, name: "application_error" } }) });
    await expect(syncContactToResend(resend, TOPIC, { email: EMAIL, subscribed: true })).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns false when the topic id is not configured", async () => {
    const { resend, update, create } = fakeResend();
    await expect(syncContactToResend(resend, undefined, { email: EMAIL, subscribed: true })).resolves.toBe(false);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe("getTopicSubscription", () => {
  it("reads the topic subscription for a contact", async () => {
    const { resend, list } = fakeResend({
      list: async () => ({ data: { data: [{ id: TOPIC, subscription: "opt_out" }] }, error: null }),
    });
    await expect(getTopicSubscription(resend, TOPIC, EMAIL)).resolves.toBe("opt_out");
    expect(list).toHaveBeenCalledWith({ email: EMAIL });
  });

  it("returns null when the contact has no entry for the topic", async () => {
    const { resend } = fakeResend({
      list: async () => ({ data: { data: [{ id: "other", subscription: "opt_in" }] }, error: null }),
    });
    await expect(getTopicSubscription(resend, TOPIC, EMAIL)).resolves.toBeNull();
  });
});
