import { describe, expect, it, vi } from "vitest";
import { cancelNow, loadCancelNowQuote, proratedCents, type CancelNowStripe } from "./cancelNow";

const DAY = 86_400;
const START = 1_793_836_800; // 2026-11-05T00:00:00Z
const END = START + 30 * DAY;
const NOW = new Date((START + 10 * DAY) * 1000); // 10 days in, 20 of 30 unused

/** Reads `table` rows by eq filters; records updates. */
function fakeDb(rows: Record<string, Record<string, unknown>[]>) {
  const updates: { table: string; values: Record<string, unknown>; filters: [string, unknown][] }[] = [];
  const from = vi.fn((table: string) => {
    const filters: [string, unknown][] = [];
    let values: Record<string, unknown> | null = null;
    const chain = {
      select: () => chain,
      update: (v: Record<string, unknown>) => ((values = v), chain),
      eq: (c: string, v: unknown) => (filters.push([c, v]), chain),
      maybeSingle: async () => {
        const found = (rows[table] ?? []).find((r) => filters.every(([c, v]) => r[c] === v));
        return { data: found ?? null, error: null };
      },
      then: (resolve: (v: unknown) => void) => {
        if (values) updates.push({ table, values, filters: [...filters] });
        resolve({ data: null, error: null });
      },
    };
    return chain;
  });
  return { db: { from } as any, updates };
}

type Line = { amount: number; period: { start: number; end: number }; discount_amounts?: { amount: number }[] };

function fakeStripe(
  opts: {
    paidCents?: number;
    lines?: Line[];
    noPaidInvoice?: boolean;
    status?: string;
    refundThrows?: boolean;
    metadata?: Record<string, string>;
    pendingItems?: { id: string; subscription: string | null }[];
  } = {},
) {
  const calls: string[] = [];
  const paid = opts.paidCents ?? 3999;
  const stripe = {
    subscriptions: {
      retrieve: vi.fn(async () => ({
        id: "sub_1",
        customer: "cus_1",
        status: opts.status ?? "active",
        metadata: opts.metadata ?? {},
        items: { data: [{ current_period_start: START, current_period_end: END }] },
      })),
      update: vi.fn(async () => (calls.push("update"), {})),
      cancel: vi.fn(async () => (calls.push("cancel"), {})),
    },
    invoices: {
      list: vi.fn(async () => ({
        data: opts.noPaidInvoice
          ? []
          : [
              {
                id: "in_1",
                amount_paid: paid,
                lines: { data: opts.lines ?? [{ amount: paid, period: { start: START, end: END } }] },
              },
            ],
      })),
    },
    invoicePayments: {
      list: vi.fn(async () => ({
        data: [{ status: "paid", amount_paid: paid, payment: { type: "payment_intent", payment_intent: "pi_1" } }],
      })),
    },
    invoiceItems: {
      list: vi.fn(async () => ({
        data: (opts.pendingItems ?? []).map((i) => ({
          id: i.id,
          parent: i.subscription ? { subscription_details: { subscription: i.subscription } } : null,
        })),
      })),
      del: vi.fn(async () => (calls.push("del"), {})),
    },
    refunds: {
      create: vi.fn(async () => {
        calls.push("refund");
        if (opts.refundThrows) throw new Error("card_declined");
        return { id: "re_1" };
      }),
    },
  };
  return { stripe: stripe as unknown as CancelNowStripe & typeof stripe, calls };
}

const active = { user_subscription: [{ id: "row1", user_id: "u1", status: "active", stripe_subscription_id: "sub_1" }] };

describe("proratedCents", () => {
  it("refunds the unused share of the period, rounded down", () => {
    expect(proratedCents(3999, START, END, START + 10 * DAY)).toBe(2666);
    expect(proratedCents(3000, START, END, START + 15 * DAY)).toBe(1500);
  });
  it("is 0 after the period and the full amount before it starts", () => {
    expect(proratedCents(3999, START, END, END + DAY)).toBe(0);
    expect(proratedCents(3999, START, END, START - DAY)).toBe(3999);
  });
});

describe("loadCancelNowQuote", () => {
  it("quotes full and prorated refunds from the latest paid invoice", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe();
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).resolves.toMatchObject({
      table: "user_subscription",
      rowId: "row1",
      stripeSubscriptionId: "sub_1",
      paidCents: 3999,
      paymentIntentId: "pi_1",
      fullCents: 3999,
      proratedCents: 2666,
      unusedDays: 20,
      periodDays: 30,
    });
  });

  it("quotes nothing to refund when the latest invoice was $0", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({ paidCents: 0 });
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).resolves.toMatchObject({
      fullCents: 0,
      proratedCents: 0,
    });
  });

  it("refunds only this period's charge, net of discounts, ignoring proration lines", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({
      paidCents: 4799,
      lines: [
        { amount: 3999, period: { start: START, end: END }, discount_amounts: [{ amount: 400 }] },
        { amount: 1200, period: { start: START - 30 * DAY, end: START } },
      ],
    });
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).resolves.toMatchObject({
      paidCents: 3599,
      fullCents: 3599,
    });
  });

  it("quotes nothing when this period hasn't been paid", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({ lines: [{ amount: 3999, period: { start: START - 30 * DAY, end: START } }] });
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).resolves.toMatchObject({ fullCents: 0 });
    const { stripe: none } = fakeStripe({ noPaidInvoice: true });
    await expect(loadCancelNowQuote(db, none, "u1", "express", NOW)).resolves.toMatchObject({ fullCents: 0 });
  });

  it("404s without an active membership", async () => {
    const { db } = fakeDb({});
    const { stripe } = fakeStripe();
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).rejects.toMatchObject({ status: 404 });
  });

  it("refuses when Stripe says the subscription already ended", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({ status: "canceled" });
    await expect(loadCancelNowQuote(db, stripe, "u1", "express", NOW)).rejects.toMatchObject({ status: 409 });
  });

  it("reads self-service memberships from their own table", async () => {
    const { db } = fakeDb({
      self_service_subscriptions: [{ id: "ss1", user_id: "u1", status: "active", stripe_subscription_id: "sub_1" }],
    });
    const { stripe } = fakeStripe();
    await expect(loadCancelNowQuote(db, stripe, "u1", "self_service", NOW)).resolves.toMatchObject({
      table: "self_service_subscriptions",
      rowId: "ss1",
    });
  });
});

describe("cancelNow", () => {
  const args = { userId: "u1", product: "express" as const, adminId: "admin1", reason: "Manager approved" };

  it("tags and cancels the subscription before refunding", async () => {
    const { db } = fakeDb(active);
    const { stripe, calls } = fakeStripe();
    await cancelNow(db, stripe, { ...args, refund: "full" }, NOW);
    expect(calls).toEqual(["update", "cancel", "refund"]);
    expect(stripe.subscriptions.update).toHaveBeenCalledWith("sub_1", {
      metadata: { canceled_by: "admin", canceled_by_admin_id: "admin1", canceled_now: "true" },
      cancellation_details: { comment: "Cancelled now by admin: Manager approved" },
    });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith("sub_1", { prorate: false });
  });

  it("refunds the full amount with an idempotency key", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe();
    await expect(cancelNow(db, stripe, { ...args, refund: "full" }, NOW)).resolves.toMatchObject({
      refundedCents: 3999,
      refundError: null,
    });
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      { payment_intent: "pi_1", amount: 3999 },
      { idempotencyKey: "cancel-now/sub_1" },
    );
  });

  it("refunds the prorated amount, worked out on the server", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe();
    await expect(cancelNow(db, stripe, { ...args, refund: "prorated" }, NOW)).resolves.toMatchObject({
      refundedCents: 2666,
    });
  });

  it("makes no refund call for 'none' or a $0 invoice", async () => {
    for (const [refund, paidCents] of [
      ["none", 3999],
      ["full", 0],
    ] as const) {
      const { db } = fakeDb(active);
      const { stripe } = fakeStripe({ paidCents });
      await expect(cancelNow(db, stripe, { ...args, refund }, NOW)).resolves.toMatchObject({ refundedCents: 0 });
      expect(stripe.refunds.create).not.toHaveBeenCalled();
    }
  });

  it("reports a failed refund without throwing, since the cancel already happened", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({ refundThrows: true });
    await expect(cancelNow(db, stripe, { ...args, refund: "full" }, NOW)).resolves.toMatchObject({
      refundedCents: 0,
      refundError: "card_declined",
    });
  });

  it("restores the earlier tags and refunds nothing when Stripe rejects the cancel", async () => {
    const { db, updates } = fakeDb(active);
    const { stripe } = fakeStripe({ metadata: { canceled_by: "admin", canceled_by_admin_id: "admin0" } });
    stripe.subscriptions.cancel.mockRejectedValueOnce(new Error("stripe down"));
    await expect(cancelNow(db, stripe, { ...args, refund: "full" }, NOW)).rejects.toThrow("stripe down");
    expect(stripe.subscriptions.update).toHaveBeenLastCalledWith("sub_1", {
      metadata: { canceled_by: "admin", canceled_by_admin_id: "admin0", canceled_now: "" },
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });

  it("carries on when the cancel call errors but Stripe did cancel", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe();
    stripe.subscriptions.cancel.mockRejectedValueOnce(new Error("timeout"));
    // First read (the quote) sees it active; the re-check after the error sees it cancelled.
    const active1 = await stripe.subscriptions.retrieve();
    stripe.subscriptions.retrieve.mockReset();
    stripe.subscriptions.retrieve
      .mockResolvedValueOnce(active1)
      .mockResolvedValueOnce({ ...active1, status: "canceled" });
    await expect(cancelNow(db, stripe, { ...args, refund: "full" }, NOW)).resolves.toMatchObject({
      refundedCents: 3999,
    });
  });

  it("deletes this subscription's pending charges so they never reach a later bill", async () => {
    const { db } = fakeDb(active);
    const { stripe } = fakeStripe({
      pendingItems: [
        { id: "ii_mine", subscription: "sub_1" },
        { id: "ii_other", subscription: "sub_2" },
        { id: "ii_loose", subscription: null },
      ],
    });
    await cancelNow(db, stripe, { ...args, refund: "none" }, NOW);
    expect(stripe.invoiceItems.list).toHaveBeenCalledWith({ customer: "cus_1", pending: true, limit: 100 });
    expect(stripe.invoiceItems.del).toHaveBeenCalledTimes(1);
    expect(stripe.invoiceItems.del).toHaveBeenCalledWith("ii_mine");
  });

  it("marks the membership cancelled in the database", async () => {
    const { db, updates } = fakeDb(active);
    const { stripe } = fakeStripe();
    await cancelNow(db, stripe, { ...args, refund: "none" }, NOW);
    expect(updates).toEqual([
      {
        table: "user_subscription",
        values: { status: "canceled", cancel_at_period_end: false },
        filters: [["id", "row1"]],
      },
    ]);
  });
});
