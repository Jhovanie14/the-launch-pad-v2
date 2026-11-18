import { describe, expect, it } from "vitest";
import { waitForPaidBooking } from "./waitForPaidBooking";

function fakeDb(appearsOnAttempt: number | null) {
  let calls = 0;
  const db = {
    get calls() {
      return calls;
    },
    from() {
      const q: any = {
        select: () => q,
        eq: () => q,
        limit: () => q,
        maybeSingle: async () => {
          calls++;
          return { data: appearsOnAttempt !== null && calls >= appearsOnAttempt ? { id: "b1" } : null };
        },
      };
      return q;
    },
  };
  return db as any;
}

describe("waitForPaidBooking", () => {
  it("returns the booking as soon as the webhook has saved it", async () => {
    const db = fakeDb(3);
    expect(await waitForPaidBooking(db, "pi_1", { delayMs: 0 })).toEqual({ id: "b1" });
    expect(db.calls).toBe(3);
  });

  it("gives up after the set number of looks", async () => {
    const db = fakeDb(null);
    expect(await waitForPaidBooking(db, "pi_1", { attempts: 4, delayMs: 0 })).toBeNull();
    expect(db.calls).toBe(4);
  });

  it("does not look at all without a payment id", async () => {
    const db = fakeDb(1);
    expect(await waitForPaidBooking(db, null)).toBeNull();
    expect(db.calls).toBe(0);
  });
});
