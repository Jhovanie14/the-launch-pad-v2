import { describe, expect, it, vi } from "vitest";
import { createUnsubscribeToken } from "./unsubscribeToken";
import { maskEmail, unsubscribeByToken } from "./unsubscribeLink";

const SECRET = "test-secret-at-least-32-characters-long";
const db = {} as any;

describe("unsubscribeByToken", () => {
  it("records an unsubscribe for the email in a valid link", async () => {
    const record = vi.fn(async () => ({ outcome: "unsubscribed" as const, synced: true }));
    const token = createUnsubscribeToken("sam@example.com", SECRET);
    await expect(unsubscribeByToken(db, token, SECRET, { record })).resolves.toEqual({
      ok: true,
      email: "sam@example.com",
    });
    expect(record).toHaveBeenCalledWith(db, {
      email: "sam@example.com",
      action: "unsubscribe",
      source: "email_link",
    });
  });

  it("does nothing for a forged or broken link", async () => {
    const record = vi.fn();
    await expect(unsubscribeByToken(db, "bad.token", SECRET, { record })).resolves.toEqual({ ok: false });
    expect(record).not.toHaveBeenCalled();
  });

  it("refuses when the secret isn't configured", async () => {
    const record = vi.fn();
    const token = createUnsubscribeToken("sam@example.com", SECRET);
    await expect(unsubscribeByToken(db, token, undefined, { record })).resolves.toEqual({ ok: false });
    expect(record).not.toHaveBeenCalled();
  });
});

describe("maskEmail", () => {
  it("shows enough to recognise the address", () => {
    expect(maskEmail("samantha@example.com")).toBe("sa••••••@example.com");
    expect(maskEmail("al@example.com")).toBe("a•@example.com");
  });
});
