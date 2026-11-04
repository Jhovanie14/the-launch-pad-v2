import { describe, expect, it, vi } from "vitest";
import { applySignupConsent } from "./signupConsent";

function fakeAdmin() {
  const updateUserById = vi.fn(async () => ({ data: {}, error: null }));
  return { admin: { auth: { admin: { updateUserById } } } as any, updateUserById };
}

const noRow = async () => null;

const confirmedUser = (metadata: Record<string, unknown>) => ({
  id: "u1",
  email: "sam@example.com",
  created_at: "2026-11-05T09:00:00Z",
  email_confirmed_at: "2026-11-05T10:00:00Z",
  user_metadata: metadata,
});

describe("applySignupConsent", () => {
  it("records a signup subscription for a confirmed user who ticked the box", async () => {
    const { admin } = fakeAdmin();
    const record = vi.fn(async () => ({ outcome: "subscribed" as const, synced: true }));
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true, full_name: "Sam Lee" }), { record, getRow: noRow });
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
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record, getRow: noRow });
    expect(updateUserById).toHaveBeenCalledWith("u1", { user_metadata: { marketing_opt_in: null } });
  });

  it("does nothing without the flag", async () => {
    for (const metadata of [{}, { marketing_opt_in: null }, { marketing_opt_in: false }, { marketing_opt_in: "true" }]) {
      const { admin, updateUserById } = fakeAdmin();
      const record = vi.fn();
      await applySignupConsent(admin, confirmedUser(metadata), { record, getRow: noRow });
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
      { record, getRow: noRow },
    );
    expect(record).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("does not override a newer choice made after the account was created", async () => {
    const { admin, updateUserById } = fakeAdmin();
    const record = vi.fn();
    const getRow = async () => ({ id: "r", email: "sam@example.com", status: "unsubscribed" as const, updated_at: "2026-11-06T09:00:00Z", resend_synced_at: null });
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record, getRow });
    expect(record).not.toHaveBeenCalled();
    // The stale tick is cleared so it can never apply later.
    expect(updateUserById).toHaveBeenCalledWith("u1", { user_metadata: { marketing_opt_in: null } });
  });

  it("still records when the only row predates the account (an earlier guest booking)", async () => {
    const { admin } = fakeAdmin();
    const record = vi.fn(async () => ({ outcome: "subscribed" as const, synced: true }));
    const getRow = async () => ({ id: "r", email: "sam@example.com", status: "unsubscribed" as const, updated_at: "2026-10-01T09:00:00Z", resend_synced_at: "2026-10-01T09:00:01Z" });
    await applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record, getRow });
    expect(record).toHaveBeenCalled();
  });

  it("never throws", async () => {
    const { admin } = fakeAdmin();
    const record = vi.fn(async () => {
      throw new Error("db down");
    });
    await expect(
      applySignupConsent(admin, confirmedUser({ marketing_opt_in: true }), { record, getRow: noRow }),
    ).resolves.toBeUndefined();
  });
});
