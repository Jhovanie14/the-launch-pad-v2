import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import { sendMembershipEndedNowEmail } from "./subscription-emails";

describe("sendMembershipEndedNowEmail", () => {
  beforeEach(() => send.mockReset());

  it("reports success when Resend accepts it", async () => {
    send.mockResolvedValue({ error: null });
    await expect(sendMembershipEndedNowEmail({ to: "a@example.com", name: "Ana", refundedAmount: null })).resolves.toBe(true);
  });

  it("reports failure when Resend refuses it (e.g. the daily limit), so the admin isn't told it was sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    send.mockResolvedValue({ error: { message: "daily quota exceeded" } });
    await expect(sendMembershipEndedNowEmail({ to: "a@example.com", name: "Ana", refundedAmount: null })).resolves.toBe(false);
  });
});
