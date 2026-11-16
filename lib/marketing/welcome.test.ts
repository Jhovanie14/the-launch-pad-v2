import { describe, expect, it } from "vitest";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { buildWelcomeEmail, findWelcomeRecipients } from "./welcome";
import { fakeDb, type Row } from "./testing/fakeDb";

const TODAY = "2026-11-16"; // yesterday = 2026-11-15 (Houston, CST = UTC-6)

const consent = (over: Row = {}): Row => ({
  email: "pat@example.com",
  user_id: null,
  status: "subscribed",
  created_at: "2026-11-15T15:00:00Z",
  subscribed_at: "2026-11-15T15:00:00Z",
  unsubscribed_at: null,
  ...over,
});

const find = (consents: Row[], extra: Record<string, Row[]> = {}) =>
  findWelcomeRecipients(fakeDb({ marketing_consents: consents, ...extra }), TODAY);

describe("findWelcomeRecipients", () => {
  it("welcomes someone whose consent was first recorded yesterday", async () => {
    await expect(find([consent()])).resolves.toEqual([{ email: "pat@example.com", firstName: null }]);
  });

  it("uses the Houston date, not the UTC one", async () => {
    // 9:30pm Houston on the 15th is 03:30Z on the 16th: yesterday in Houston.
    await expect(find([consent({ created_at: "2026-11-16T03:30:00Z" })])).resolves.toHaveLength(1);
    // 10pm Houston on the 14th is 04:00Z on the 15th: two days ago in Houston.
    await expect(find([consent({ created_at: "2026-11-15T04:00:00Z" })])).resolves.toEqual([]);
  });

  it("ignores today's and older sign-ups", async () => {
    await expect(
      find([consent({ created_at: "2026-11-16T15:00:00Z" }), consent({ created_at: "2026-11-01T15:00:00Z" })]),
    ).resolves.toEqual([]);
  });

  it("never goes by subscribed_at: an old row ticked again yesterday is skipped", async () => {
    await expect(
      find([consent({ created_at: "2026-11-01T15:00:00Z", subscribed_at: "2026-11-15T15:00:00Z" })]),
    ).resolves.toEqual([]);
  });

  it("skips unsubscribed rows and rows that were ever unsubscribed", async () => {
    await expect(
      find([
        consent({ status: "unsubscribed" }),
        consent({ email: "b@example.com", unsubscribed_at: "2026-11-15T16:00:00Z" }),
      ]),
    ).resolves.toEqual([]);
  });

  it("skips active members, by consent account or by profile email", async () => {
    await expect(
      find([consent({ user_id: "u1" }), consent({ email: "Guest@Example.com" })], {
        profiles: [{ id: "u2", email: "Guest@Example.com", full_name: "Guest" }],
        user_subscription: [
          { user_id: "u1", status: "active" },
          { user_id: "u2", status: "active" },
        ],
      }),
    ).resolves.toEqual([]);
  });

  it("takes the first name from the profile", async () => {
    await expect(
      find([consent({ user_id: "u1" })], { profiles: [{ id: "u1", email: "pat@example.com", full_name: "Pat Lee" }] }),
    ).resolves.toEqual([{ email: "pat@example.com", firstName: "Pat" }]);
  });
});

describe("buildWelcomeEmail", () => {
  const url = "https://www.thelaunchpadwash.com/unsubscribe?t=abc";
  const email = buildWelcomeEmail({ firstName: "Pat", unsubscribeUrl: url });

  it("has the agreed subject", () => {
    expect(email.subject).toBe("Welcome to The Launch Pad");
  });

  it("says where we are, links to booking and mentions the membership price", () => {
    expect(email.html).toContain("10410 S Main St");
    expect(email.html).toContain("/service");
    expect(email.html).toContain("$39.99");
    expect(email.html).toContain(url);
  });

  it("mentions the first-month offer only while it runs", () => {
    expect(email.html.includes(`${FIRST_SUBSCRIPTION_PROMO.percent}% off`)).toBe(FIRST_SUBSCRIPTION_PROMO.enabled);
  });

  it("escapes the name and works without one", () => {
    expect(buildWelcomeEmail({ firstName: "<b>", unsubscribeUrl: url }).html).toContain("&lt;b&gt;");
    expect(buildWelcomeEmail({ firstName: null, unsubscribeUrl: url }).html).not.toContain("null");
  });
});
