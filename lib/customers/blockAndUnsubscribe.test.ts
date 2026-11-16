import { beforeEach, describe, expect, it, vi } from "vitest";

const blockCustomer = vi.fn();
const recordConsent = vi.fn();
vi.mock("./customerBlocks", () => ({ blockCustomer: (...a: unknown[]) => blockCustomer(...a) }));
vi.mock("@/lib/marketing/consent", () => ({ recordConsent: (...a: unknown[]) => recordConsent(...a) }));

import { ApiError } from "@/lib/http/apiError";
import { blockAndUnsubscribe, blockAfterCancel } from "./blockAndUnsubscribe";

const db = {} as any;

beforeEach(() => {
  blockCustomer.mockReset();
  recordConsent.mockReset();
});

describe("blockAndUnsubscribe", () => {
  it("blocks the customer and unsubscribes their email from marketing", async () => {
    blockCustomer.mockResolvedValue({ email: "pat@example.com", plates: ["ABC1234"] });
    recordConsent.mockResolvedValue({});
    await expect(blockAndUnsubscribe(db, "user-1", "admin-1", "Manager approved")).resolves.toEqual({
      email: "pat@example.com",
      plates: ["ABC1234"],
    });
    expect(blockCustomer).toHaveBeenCalledWith(db, "user-1", "admin-1", "Manager approved");
    expect(recordConsent).toHaveBeenCalledWith(db, {
      email: "pat@example.com",
      action: "unsubscribe",
      source: "block",
    });
  });

  it("keeps the block when the marketing unsubscribe fails", async () => {
    blockCustomer.mockResolvedValue({ email: "pat@example.com", plates: [] });
    recordConsent.mockRejectedValue(new Error("resend down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(blockAndUnsubscribe(db, "user-1", "admin-1", "r")).resolves.toEqual({
      email: "pat@example.com",
      plates: [],
    });
  });

  it("skips the unsubscribe when there is no email", async () => {
    blockCustomer.mockResolvedValue({ email: null, plates: ["ABC1234"] });
    await blockAndUnsubscribe(db, "user-1", "admin-1", "r");
    expect(recordConsent).not.toHaveBeenCalled();
  });
});

describe("blockAfterCancel", () => {
  it("does nothing when the box wasn't ticked", async () => {
    await expect(blockAfterCancel(false, db, "user-1", "admin-1", "r")).resolves.toEqual({});
    expect(blockCustomer).not.toHaveBeenCalled();
  });

  it("says what was blocked", async () => {
    blockCustomer.mockResolvedValue({ email: "pat@example.com", plates: ["ABC1234", "XYZ9"] });
    recordConsent.mockResolvedValue({});
    await expect(blockAfterCancel(true, db, "user-1", "admin-1", "r")).resolves.toEqual({
      blockedNote: " Also blocked: pat@example.com, ABC1234, XYZ9.",
    });
  });

  it("reports a failed block as a warning instead of throwing, since the cancel already happened", async () => {
    blockCustomer.mockRejectedValue(new ApiError("Could not save the block. Please try again.", 500));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(blockAfterCancel(true, db, "user-1", "admin-1", "r")).resolves.toEqual({
      warning:
        "The block failed: Could not save the block. Please try again. Use Block Customer to try again.",
    });
  });
});
