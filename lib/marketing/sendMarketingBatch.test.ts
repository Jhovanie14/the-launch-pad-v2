import { describe, expect, it, vi } from "vitest";
import { sendMarketingBatch, type MarketingResendLike } from "./sendMarketingBatch";
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
  it("sends in chunks of 100 keyed <prefix>/<today>/<n>, with one-click unsubscribe headers", async () => {
    const { resend, send } = fakeResend();
    await expect(sendMarketingBatch(resend, people(250), opts)).resolves.toEqual({ sent: 250, failed: 0 });

    expect(send).toHaveBeenCalledTimes(3);
    const calls = send.mock.calls as unknown as [Array<Record<string, any>>, { idempotencyKey: string }][];
    expect(calls.map(([batch]) => batch.length)).toEqual([100, 100, 50]);
    expect(calls.map(([, o]) => o.idempotencyKey)).toEqual([
      "nudge/2026-11-16/0",
      "nudge/2026-11-16/1",
      "nudge/2026-11-16/2",
    ]);

    const email = calls[0][0][0];
    expect(email.to).toBe("c0@example.com");
    expect(email.subject).toBe("Hello");
    expect(email.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const oneClick = /^<(.+)>$/.exec(email.headers["List-Unsubscribe"])![1];
    expect(verifyUnsubscribeToken(new URL(oneClick).searchParams.get("t"), SECRET)).toBe("c0@example.com");
    expect(email.html).toContain(`${SITE}/unsubscribe?t=`);
  });

  it("counts a failed or throwing batch as failed and carries on", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ data: { data: [] }, error: null });
    const resend = { batch: { send } } as unknown as MarketingResendLike;
    await expect(sendMarketingBatch(resend, people(201), opts)).resolves.toEqual({ sent: 1, failed: 200 });
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("does nothing for no recipients", async () => {
    const { resend, send } = fakeResend();
    await expect(sendMarketingBatch(resend, [], opts)).resolves.toEqual({ sent: 0, failed: 0 });
    expect(send).not.toHaveBeenCalled();
  });
});
