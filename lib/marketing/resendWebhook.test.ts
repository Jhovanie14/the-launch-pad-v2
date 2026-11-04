import { describe, expect, it } from "vitest";
import { decideFromContactEvent } from "./resendWebhook";

const updated = (unsubscribed = false) => ({
  type: "contact.updated" as const,
  data: { email: "sam@example.com", unsubscribed },
});
const deleted = { type: "contact.deleted" as const, data: { email: "sam@example.com", unsubscribed: false } };

describe("decideFromContactEvent", () => {
  it("contact.deleted unsubscribes a subscribed customer", () => {
    expect(decideFromContactEvent(deleted, null, "subscribed")).toEqual({
      action: "unsubscribe",
      source: "resend_unsubscribe",
    });
  });

  it("a global unsubscribe unsubscribes", () => {
    expect(decideFromContactEvent(updated(true), "opt_in", "subscribed")).toEqual({
      action: "unsubscribe",
      source: "resend_unsubscribe",
    });
  });

  it("a topic opt-out unsubscribes", () => {
    expect(decideFromContactEvent(updated(), "opt_out", "subscribed")).toEqual({
      action: "unsubscribe",
      source: "resend_unsubscribe",
    });
  });

  it("a topic opt-in re-subscribes an unsubscribed customer", () => {
    expect(decideFromContactEvent(updated(), "opt_in", "unsubscribed")).toEqual({
      action: "subscribe",
      source: "resend_preferences",
    });
  });

  it("no change when Resend already matches us", () => {
    expect(decideFromContactEvent(updated(), "opt_in", "subscribed")).toBeNull();
    expect(decideFromContactEvent(updated(), "opt_out", "unsubscribed")).toBeNull();
    expect(decideFromContactEvent(deleted, null, "unsubscribed")).toBeNull();
  });

  it("does not re-subscribe a globally unsubscribed contact", () => {
    expect(decideFromContactEvent(updated(true), "opt_in", "unsubscribed")).toBeNull();
  });

  it("ignores an unknown topic state", () => {
    expect(decideFromContactEvent(updated(), null, "subscribed")).toBeNull();
  });

  it("does not re-subscribe from stale Resend state while our opt-out is still unsynced", () => {
    // Customer opted out on our site while Resend was down: Resend still says opt_in.
    expect(decideFromContactEvent(updated(), "opt_in", "unsubscribed", true)).toBeNull();
  });

  it("still honours a Resend unsubscribe while our change is unsynced", () => {
    // An unsubscribe click must win even if our pending change says subscribed.
    expect(decideFromContactEvent(updated(), "opt_out", "subscribed", true)).toEqual({
      action: "unsubscribe",
      source: "resend_unsubscribe",
    });
  });

  it("ignores contacts we have no row for", () => {
    expect(decideFromContactEvent(updated(), "opt_in", null)).toBeNull();
    expect(decideFromContactEvent(updated(true), "opt_out", null)).toBeNull();
  });
});
