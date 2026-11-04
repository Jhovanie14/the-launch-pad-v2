import { describe, expect, it, vi } from "vitest";
import { applySignupConsent } from "./signupConsent";

function fakeAdmin() {
  const updateUserById = vi.fn(async () => ({ data: {}, error: null }));
  return { admin: { auth: { admin: { updateUserById } } } as any, updateUserById };
}

const confirmedUser = (metadata: Record<string, unknown>) => ({
  id: "u1",
  email: "sam@example.com",
  email_confirmed_at: "2026-11-05T10:00:00Z",
  user_metadata: metadata,
});

describe("applySignupConsent", () => {
  it("records a signup subscription for a confirmed user who ticked the box", async () => {
    const { admin } = fakeAdmin();
    const record = vi.fn(async () => ({ outcome: "subscribed" as const, synced: true }));
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true, full_name: "Sam Lee" }), { record });
    expect(record).toHaveBeenCalledWith(admin, {
      email: "sam@example.com",
      userId: "u1",
      action: "subscribe",
      source: "signup",
      firstName: "Sam",
    });
  });

  it("clears the flag after recording so later confirm links cannot re-subscribe", async () => {
    const { admin, updateUserById } = fakeAdmin();
    const record = vi.fn(async () => ({ outcome: "subscribed" as const, synced: true }));
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record });
    expect(updateUserById).toHaveBeenCalledWith("u1", { user_metadata: { marketing_opt_in: null } });
  });

  it("does nothing without the flag", async () => {
    for (const metadata of [{}, { marketing_opt_in: null }, { marketing_opt_in: false }, { marketing_opt_in: "true" }]) {
      const { admin, updateUserById } = fakeAdmin();
      const record = vi.fn();
      await applySignupConsent(admin, confirmedUser(metadata), { record });
      expect(record).not.toHaveBeenCalled();
      expect(updateUserById).not.toHaveBeenCalled();
    }
  });

  it("does nothing for an unconfirmed email", async () => {
    const { admin, updateUserById } = fakeAdmin();
    const record = vi.fn();
    await applySignupConsent(
      admin,
      { ...confirmedUser({ marketing_opt_in: true }), email_confirmed_at: null },
      { record },
    );
    expect(record).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("never throws", async () => {
    const { admin } = fakeAdmin();
    const record = vi.fn(async () => {
      throw new Error("db down");
    });
    await expect(
      applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record }),
    ).resolves.toBeUndefined();
  });
});
