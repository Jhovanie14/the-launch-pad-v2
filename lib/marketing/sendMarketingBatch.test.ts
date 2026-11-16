import { describe, expect, it, vi } from "vitest";
import { MARKETING_DAILY_LIMIT, sendMarketingBatch, type MarketingResendLike } from "./sendMarketingBatch";
import { verifyUnsubscribeToken } from "./unsubscribeToken";

const SECRET = "test-secret-at-least-32-characters-long";
const SITE = "https://www.thelaunchpadwash.com";
const TODAY = "2026-11-16";
const build = (r: { email: string }, unsubscribeUrl: string) => ({
  subject: "Hello",
  html: `<p>${r.email}</p><a href="${unsubscribeUrl}">unsubscribe</a>`,
});
const people = (n: number) => Array.from({ length: n }, (_, i) => ({ email: `c${i}@example.com` }));
const opts = { secret: SECRET, siteUrl: SITE, today: TODAY, keyPrefix: "nudge", build };

function fakeResend() {
  const send = vi.fn(async () => ({ data: { data: [] }, error: null as unknown }));
  return { resend: { batch: { send } } as unknown as MarketingResendLike, send };
}

describe("sendMarketingBatch", () => {
  it("sends one batch keyed <prefix>/<today>/0, with one-click unsubscribe headers", async () => {
    const { resend, send } = fakeResend();
    await expect(sendMarketingBatch(resend, people(15), opts)).resolves.toEqual({ sent: 15, failed: 0, heldBack: 0 });

    expect(send).toHaveBeenCalledTimes(1);
    const calls = send.mock.calls as unknown as [Array<Record<string, any>>, { idempotencyKey: string }][];
    expect(calls[0][0]).toHaveLength(15);
    expect(calls[0][1].idempotencyKey).toBe("nudge/2026-11-16/0");

    const email = calls[0][0][0];
    expect(email.to).toBe("c0@example.com");
    expect(email.subject).toBe("Hello");
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const oneClick = /^<(.+)>$/.exec(email.headers["List-Unsubscribe"])![1];
    expect(verifyUnsubscribeToken(new URL(oneClick).searchParams.get("t"), SECRET)).toBe("c0@example.com");
    expect(email.html).toContain(`${SITE}/unsubscribe?t=`);
  });

  it("counts a failed batch as failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn().mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const resend = { batch: { send } } as unknown as MarketingResendLike;
    await expect(sendMarketingBatch(resend, people(3), opts)).resolves.toEqual({ sent: 0, failed: 3, heldBack: 0 });
  });

  it("counts a throwing batch as failed instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn().mockRejectedValueOnce(new Error("network"));
    const resend = { batch: { send } } as unknown as MarketingResendLike;
    await expect(sendMarketingBatch(resend, people(3), opts)).resolves.toEqual({ sent: 0, failed: 3, heldBack: 0 });
  });

  it("sends at most the daily limit and reports the rest as held back", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resend, send } = fakeResend();
    await expect(sendMarketingBatch(resend, people(MARKETING_DAILY_LIMIT + 5), opts)).resolves.toEqual({
      sent: MARKETING_DAILY_LIMIT,
      failed: 0,
      heldBack: 5,
    });
    const [batch] = send.mock.calls[0] as unknown as [unknown[]];
    expect(batch).toHaveLength(MARKETING_DAILY_LIMIT);
  });

  it("does nothing for no recipients", async () => {
    const { resend, send } = fakeResend();
    await expect(sendMarketingBatch(resend, [], opts)).resolves.toEqual({ sent: 0, failed: 0, heldBack: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
