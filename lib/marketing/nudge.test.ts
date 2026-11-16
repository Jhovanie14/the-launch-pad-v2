import { describe, expect, it } from "vitest";
import { FIRST_SUBSCRIPTION_PROMO } from "@/lib/pricing/firstSubscriptionPromo";
import { buildNudgeEmail, findNudgeRecipients, isPaidWash } from "./nudge";
import { fakeDb, type Row } from "./testing/fakeDb";

const TODAY = "2026-11-16";
const YESTERDAY = "2026-11-15";

let nextId = 0;
const wash = (over: Row = {}): Row => ({
  id: `b${nextId++}`,
  customer_email: "sam@example.com",
  customer_name: "Sam Rivera",
  user_id: null,
  appointment_date: YESTERDAY,
  status: "completed",
  payment_method: "card",
  total_price: 25,
  ...over,
});

const everyoneOptedIn = async () => true;
const find = (bookings: Row[], extra: Record<string, Row[]> = {}) =>
  findNudgeRecipients(fakeDb({ bookings, ...extra }), TODAY, { isOptedIn: everyoneOptedIn });

describe("isPaidWash", () => {
  it("counts completed card and cash washes with a price", () => {
    expect(isPaidWash({ status: "completed", payment_method: "card", total_price: 25 })).toBe(true);
    expect(isPaidWash({ status: "completed", payment_method: "cash", total_price: "18.00" })).toBe(true);
  });
  it("doesn't count membership, free or unfinished bookings", () => {
    expect(isPaidWash({ status: "completed", payment_method: "subscription", total_price: 25 })).toBe(false);
    expect(isPaidWash({ status: "completed", payment_method: "card", total_price: "0" })).toBe(false);
    expect(isPaidWash({ status: "completed", payment_method: "card", total_price: null })).toBe(false);
    expect(isPaidWash({ status: "pending", payment_method: "card", total_price: 25 })).toBe(false);
  });
});

describe("findNudgeRecipients", () => {
  it("nudges an opted-in customer whose second paid wash was yesterday", async () => {
    await expect(find([wash({ appointment_date: "2026-10-20" }), wash()])).resolves.toEqual([
      { email: "sam@example.com", firstName: "Sam", washes: 2, spent: 50 },
    ]);
  });

  it("not after a third paid wash", async () => {
    await expect(
      find([wash({ appointment_date: "2026-10-20" }), wash({ appointment_date: "2026-11-01" }), wash()]),
    ).resolves.toEqual([]);
  });

  it("not again for a regular who washes every 20 days", async () => {
    // 10-06, 10-26, 11-15: the window holds two, but 10-06 is within 30 days before 10-26.
    await expect(
      find([wash({ appointment_date: "2026-10-06" }), wash({ appointment_date: "2026-10-26" }), wash()]),
    ).resolves.toEqual([]);
  });

  it("nudges again for a new run of visits after a long gap", async () => {
    // 10-20 had no paid wash in the 30 days before it (08-01 is far earlier).
    await expect(
      find([wash({ appointment_date: "2026-08-01" }), wash({ appointment_date: "2026-10-20" }), wash()]),
    ).resolves.toHaveLength(1);
  });

  it("reads past the 1,000-rows-per-request limit", async () => {
    // 1,000 one-off customers sort before this customer's rows by id.
    const others = Array.from({ length: 1000 }, (_, i) =>
      wash({ id: `a${String(i).padStart(4, "0")}`, customer_email: `o${i}@example.com`, appointment_date: "2026-10-20" }),
    );
    await expect(
      find([...others, wash({ id: "z1", appointment_date: "2026-10-20" }), wash({ id: "z2" })]),
    ).resolves.toEqual([{ email: "sam@example.com", firstName: "Sam", washes: 2, spent: 50 }]);
  });

  it("not after a first paid wash", async () => {
    await expect(find([wash()])).resolves.toEqual([]);
  });

  it("ignores washes before the 30-day window", async () => {
    await expect(find([wash({ appointment_date: "2026-10-16" }), wash()])).resolves.toEqual([]);
  });

  it("counts a wash on the first day of the window", async () => {
    await expect(find([wash({ appointment_date: "2026-10-17" }), wash()])).resolves.toHaveLength(1);
  });

  it("not when yesterday's wash wasn't paid", async () => {
    await expect(
      find([wash({ appointment_date: "2026-10-20" }), wash({ payment_method: "subscription" })]),
    ).resolves.toEqual([]);
  });

  it("membership, free and unfinished bookings don't count toward the two", async () => {
    await expect(
      find([
        wash({ appointment_date: "2026-10-20", payment_method: "subscription" }),
        wash({ appointment_date: "2026-10-21", total_price: 0 }),
        wash({ appointment_date: "2026-10-22", status: "pending" }),
        wash(),
      ]),
    ).resolves.toEqual([]);
  });

  it("groups one person by email in any case", async () => {
    await expect(
      find([wash({ appointment_date: "2026-10-20", customer_email: "Sam@Example.com" }), wash()]),
    ).resolves.toEqual([{ email: "sam@example.com", firstName: "Sam", washes: 2, spent: 50 }]);
  });

  it("groups one person by account across emails", async () => {
    await expect(
      find([
        wash({ appointment_date: "2026-10-20", user_id: "u1", customer_email: "work@example.com" }),
        wash({ user_id: "u1" }),
      ]),
    ).resolves.toEqual([{ email: "sam@example.com", firstName: "Sam", washes: 2, spent: 50 }]);
  });

  it("sums prices given as strings", async () => {
    await expect(
      find([wash({ appointment_date: "2026-10-20", total_price: "25.00" }), wash({ total_price: "33.50" })]),
    ).resolves.toEqual([{ email: "sam@example.com", firstName: "Sam", washes: 2, spent: 58.5 }]);
  });

  it("skips members", async () => {
    await expect(
      find([wash({ appointment_date: "2026-10-20", user_id: "u1" }), wash({ user_id: "u1" })], {
        user_subscription: [{ user_id: "u1", status: "active" }],
      }),
    ).resolves.toEqual([]);
  });

  it("only emails people who opted in", async () => {
    const db = fakeDb({ bookings: [wash({ appointment_date: "2026-10-20" }), wash()] });
    await expect(findNudgeRecipients(db, TODAY, { isOptedIn: async () => false })).resolves.toEqual([]);
  });
});

describe("buildNudgeEmail", () => {
  const url = "https://www.thelaunchpadwash.com/unsubscribe?t=abc";
  const email = buildNudgeEmail({ firstName: "Sam", washes: 2, spent: 50, unsubscribeUrl: url });

  it("has the agreed subject", () => {
    expect(email.subject).toBe("Two washes this month? A membership could save you money");
  });

  it("shows what they paid, the membership price and the plans link", () => {
    expect(email.html).toContain("$50.00");
    expect(email.html).toContain("2 washes");
    expect(email.html).toContain("$39.99");
    expect(email.html).toContain("/pricing");
    expect(email.html).toContain(url);
  });

  it("mentions the first-month offer only while it runs", () => {
    expect(email.html.includes(`${FIRST_SUBSCRIPTION_PROMO.percent}% off`)).toBe(FIRST_SUBSCRIPTION_PROMO.enabled);
  });

  it("never promises a specific saving", () => {
    expect(email.html).not.toMatch(/save \$/i);
  });

  it("escapes the name and works without one", () => {
    expect(buildNudgeEmail({ firstName: "<b>", washes: 2, spent: 50, unsubscribeUrl: url }).html).toContain("&lt;b&gt;");
    expect(buildNudgeEmail({ firstName: null, washes: 2, spent: 50, unsubscribeUrl: url }).html).not.toContain("null");
  });
});
