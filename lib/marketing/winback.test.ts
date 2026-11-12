import { describe, expect, it, vi } from "vitest";
import { verifyUnsubscribeToken } from "./unsubscribeToken";
import {
  WINBACK_AFTER_DAYS,
  buildWinbackEmail,
  findWinbackRecipients,
  sendWinbackEmails,
  winbackVisitDate,
  type WinbackResendLike,
} from "./winback";

/* A tiny in-memory stand-in for the Supabase query builder: enough of
   select / eq / neq / gt / in to run the real queries against rows. */
type Row = Record<string, unknown>;
function fakeDb(tables: Record<string, Row[]>) {
  const from = vi.fn((table: string) => {
    const preds: ((r: Row) => boolean)[] = [];
    const chain = {
      select: () => chain,
      eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), chain),
      neq: (c: string, v: unknown) => (preds.push((r) => r[c] !== v), chain),
      gt: (c: string, v: string) => (preds.push((r) => String(r[c]) > v), chain),
      in: (c: string, vs: unknown[]) => (preds.push((r) => vs.includes(r[c])), chain),
      then: (resolve: (v: { data: Row[]; error: null }) => void) =>
        resolve({ data: (tables[table] ?? []).filter((r) => preds.every((p) => p(r))), error: null }),
    };
    return chain;
  });
  return { from } as any;
}

const TODAY = "2026-11-12";
const VISIT = "2026-10-13"; // 30 days earlier

const visit = (over: Row = {}): Row => ({
  customer_email: "sam@example.com",
  customer_name: "Sam Rivera",
  user_id: null,
  appointment_date: VISIT,
  status: "completed",
  ...over,
});

const everyoneOptedIn = async () => true;

describe("winbackVisitDate", () => {
  it(`is ${WINBACK_AFTER_DAYS} days before today`, () => {
    expect(winbackVisitDate(TODAY)).toBe(VISIT);
  });
});

describe("findWinbackRecipients", () => {
  it("picks an opted-in customer whose last wash was 30 days ago", async () => {
    const db = fakeDb({ bookings: [visit()] });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toEqual([
      { email: "sam@example.com", firstName: "Sam" },
    ]);
  });

  it("ignores visits on other days and bookings that weren't completed", async () => {
    const db = fakeDb({
      bookings: [
        visit({ appointment_date: "2026-10-12" }),
        visit({ customer_email: "x@example.com", status: "cancelled" }),
      ],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toEqual([]);
  });

  it("skips someone who has booked again since", async () => {
    const db = fakeDb({
      bookings: [visit(), visit({ appointment_date: "2026-11-20", status: "pending" })],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toEqual([]);
  });

  it("does not count a later cancelled booking as coming back", async () => {
    const db = fakeDb({
      bookings: [visit(), visit({ appointment_date: "2026-11-01", status: "cancelled" })],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toHaveLength(1);
  });

  it("skips someone who came back under their account with another email", async () => {
    const db = fakeDb({
      bookings: [
        visit({ user_id: "u1" }),
        visit({ user_id: "u1", customer_email: "work@example.com", appointment_date: "2026-11-02" }),
      ],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toEqual([]);
  });

  it("skips members with an active plan, found by account or by email", async () => {
    const db = fakeDb({
      bookings: [
        visit({ user_id: "u1" }),
        visit({ customer_email: "guest@example.com", customer_name: "Guest" }),
      ],
      profiles: [{ id: "u2", email: "guest@example.com" }],
      user_subscription: [{ user_id: "u1", status: "active" }],
      self_service_subscriptions: [{ user_id: "u2", status: "active" }],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toEqual([]);
  });

  it("still emails someone whose plan has ended", async () => {
    const db = fakeDb({
      bookings: [visit({ user_id: "u1" })],
      user_subscription: [{ user_id: "u1", status: "canceled" }],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toHaveLength(1);
  });

  it("only emails people who opted in", async () => {
    const db = fakeDb({
      bookings: [visit(), visit({ customer_email: "no@example.com", customer_name: "No" })],
    });
    const isOptedIn = async (email: string) => email === "sam@example.com";
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn })).resolves.toEqual([
      { email: "sam@example.com", firstName: "Sam" },
    ]);
  });

  it("emails a person once even with two washes that day", async () => {
    const db = fakeDb({
      bookings: [visit(), visit({ customer_email: "SAM@example.com", customer_name: null })],
    });
    await expect(findWinbackRecipients(db, TODAY, { isOptedIn: everyoneOptedIn })).resolves.toHaveLength(1);
  });
});

describe("buildWinbackEmail", () => {
  const unsubscribe = "https://www.thelaunchpadwash.com/unsubscribe?t=abc";

  it("greets the customer and links to booking", () => {
    const { subject, html } = buildWinbackEmail({ firstName: "Sam", unsubscribeUrl: unsubscribe });
    expect(subject).toBe("We miss you at The Launch Pad");
    expect(html).toContain("It’s been a while, Sam");
    expect(html).toContain("/service");
  });

  it("works without a name", () => {
    const { html } = buildWinbackEmail({ firstName: null, unsubscribeUrl: unsubscribe });
    expect(html).toContain("It’s been a while");
    expect(html).not.toContain("while, ");
  });

  it("escapes the name and carries the unsubscribe link", () => {
    const { html } = buildWinbackEmail({ firstName: "<b>Sam</b>", unsubscribeUrl: unsubscribe });
    expect(html).not.toContain("<b>Sam</b>");
    expect(html).toContain(`href="${unsubscribe}"`);
  });

  it("mentions the real membership price and new-member offer", () => {
    const { html } = buildWinbackEmail({ firstName: "Sam", unsubscribeUrl: unsubscribe });
    expect(html).toContain("$39.99");
    expect(html).toContain("10% off");
  });
});

describe("sendWinbackEmails", () => {
  const SECRET = "test-secret-at-least-32-characters-long";
  const SITE = "https://www.thelaunchpadwash.com";

  function fakeResend(result: { data: unknown; error: unknown } = { data: { data: [] }, error: null }) {
    const send = vi.fn<(...args: unknown[]) => Promise<typeof result>>(async () => result);
    return { resend: { batch: { send } } as unknown as WinbackResendLike, send };
  }

  it("sends in batches of 100 with a one-click unsubscribe header", async () => {
    const { resend, send } = fakeResend();
    const recipients = Array.from({ length: 150 }, (_, i) => ({ email: `c${i}@example.com`, firstName: null }));
    const result = await sendWinbackEmails(resend, recipients, { secret: SECRET, siteUrl: SITE, today: TODAY });

    expect(result).toEqual({ sent: 150, failed: 0 });
    expect(send).toHaveBeenCalledTimes(2);
    const [firstBatch, firstOpts] = send.mock.calls[0] as [Array<Record<string, any>>, Record<string, string>];
    expect(firstBatch).toHaveLength(100);
    expect(firstOpts.idempotencyKey).toBe(`winback/${TODAY}/0`);

    const email = firstBatch[0];
    expect(email.to).toBe("c0@example.com");
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const oneClick = /^<(.+)>$/.exec(email.headers["List-Unsubscribe"])![1];
    expect(oneClick.startsWith(`${SITE}/api/marketing/unsubscribe?t=`)).toBe(true);
    expect(verifyUnsubscribeToken(new URL(oneClick).searchParams.get("t"), SECRET)).toBe("c0@example.com");
    expect(email.html).toContain(`${SITE}/unsubscribe?t=`);
  });

  it("counts a failed batch without stopping the rest", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockResolvedValueOnce({ data: { data: [] }, error: null });
    const resend = { batch: { send } } as unknown as WinbackResendLike;
    const recipients = Array.from({ length: 101 }, (_, i) => ({ email: `c${i}@example.com`, firstName: null }));
    await expect(
      sendWinbackEmails(resend, recipients, { secret: SECRET, siteUrl: SITE, today: TODAY }),
    ).resolves.toEqual({ sent: 1, failed: 100 });
  });

  it("does nothing for nobody", async () => {
    const { resend, send } = fakeResend();
    await expect(sendWinbackEmails(resend, [], { secret: SECRET, siteUrl: SITE, today: TODAY })).resolves.toEqual({
      sent: 0,
      failed: 0,
    });
    expect(send).not.toHaveBeenCalled();
  });
});
