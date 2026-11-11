import { describe, expect, it } from "vitest";
import { BILLING_VISIBLE_STATUSES, isOverdue, pickBillingSubscription } from "./billingStatus";

describe("BILLING_VISIBLE_STATUSES", () => {
  it("includes plans whose payment failed, not only active ones", () => {
    expect(BILLING_VISIBLE_STATUSES).toEqual(["active", "past_due", "unpaid"]);
  });
});

describe("pickBillingSubscription", () => {
  it("returns null when there is nothing", () => {
    expect(pickBillingSubscription([])).toBeNull();
    expect(pickBillingSubscription(null)).toBeNull();
  });

  it("shows an overdue plan when it is the only one", () => {
    expect(pickBillingSubscription([{ id: "a", status: "past_due" }])).toEqual({ id: "a", status: "past_due" });
  });

  it("prefers the active plan over an older overdue one", () => {
    const rows = [
      { id: "old", status: "unpaid" },
      { id: "new", status: "active" },
      { id: "mid", status: "past_due" },
    ];
    expect(pickBillingSubscription(rows)?.id).toBe("new");
  });

  it("prefers past_due over unpaid", () => {
    const rows = [
      { id: "u", status: "unpaid" },
      { id: "p", status: "past_due" },
    ];
    expect(pickBillingSubscription(rows)?.id).toBe("p");
  });
});

describe("isOverdue", () => {
  it("is true for past_due and unpaid only", () => {
    expect(isOverdue("past_due")).toBe(true);
    expect(isOverdue("unpaid")).toBe(true);
    expect(isOverdue("active")).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });
});
