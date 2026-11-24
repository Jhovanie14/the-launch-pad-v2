import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runHoldJob } from "./holds";

const HOLD = "2026-11-27T05:59:59.999Z"; // held through Thu Nov 26, Houston
const WED_9AM = new Date("2026-11-25T15:00:00Z");
const FRI_9AM = new Date("2026-11-27T15:00:00Z");

const reservation = (over: Record<string, unknown> = {}) => ({
  id: "1a2b3c4d-0000-4000-8000-000000000000",
  user_id: "u1",
  payment_method: "at_store",
  payment_status: "unpaid",
  fulfilment_status: "ready",
  fulfillment_method: "pickup",
  hold_until: HOLD,
  reminder_sent_at: null,
  total: 25.2,
  ...over,
});

/** In-memory product_orders: reads filter by eq, updates apply to matching rows. */
function fakeDb(rows: Record<string, any>[]) {
  const state = { rpc: [] as string[] };
  const match = (r: any, eqs: [string, unknown][], nulls: string[], ins: [string, unknown[]][] = []) =>
    eqs.every(([c, v]) => r[c] === v) && nulls.every((c) => r[c] == null) && ins.every(([c, vs]) => vs.includes(r[c]));
  const db = {
    from(table: string) {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { email: "dee@example.com", full_name: "Dee" }, error: null }) }) }) };
      }
      const eqs: [string, unknown][] = [];
      const nulls: string[] = [];
      const ins: [string, unknown[]][] = [];
      let patch: any = null;
      const chain: any = {
        select: () => {
          if (patch) {
            const hit = rows.filter((r) => match(r, eqs, nulls, ins));
            hit.forEach((r) => Object.assign(r, patch));
            return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
          }
          return chain;
        },
        update: (values: any) => ((patch = values), chain),
        eq: (c: string, v: unknown) => (eqs.push([c, v]), chain),
        in: (c: string, vs: unknown[]) => (ins.push([c, vs]), chain),
        is: (c: string) => (nulls.push(c), chain),
        then: (resolve: any) => resolve({ data: rows.filter((r) => match(r, eqs, nulls, ins)).map((r) => ({ ...r })), error: null }),
      };
      return chain;
    },
    async rpc(fn: string) {
      state.rpc.push(fn);
      return { data: null, error: null };
    },
  } as any;
  return { db, state };
}

const emails = () => ({ reminder: vi.fn(async () => {}), released: vi.fn(async () => {}) });

describe("runHoldJob", () => {
  it("sends the reminder once, the day before the hold date", async () => {
    const { db } = fakeDb([reservation()]);
    const e = emails();
    expect(await runHoldJob({ db, now: WED_9AM, pickupHours: null, emails: e })).toEqual({ reminded: 1, released: 0, restocked: 0 });
    expect(e.reminder).toHaveBeenCalledWith(expect.objectContaining({ holdDate: "Thu, Nov 26", total: 25.2 }));
    expect(await runHoldJob({ db, now: WED_9AM, pickupHours: null, emails: e })).toEqual({ reminded: 0, released: 0, restocked: 0 });
    expect(e.reminder).toHaveBeenCalledTimes(1);
  });

  it("releases an overdue reservation once, returning its stock", async () => {
    const rows = [reservation({ reminder_sent_at: "2026-11-25T15:00:00Z" })];
    const { db, state } = fakeDb(rows);
    const e = emails();
    expect(await runHoldJob({ db, now: FRI_9AM, pickupHours: null, emails: e })).toEqual({ reminded: 0, released: 1, restocked: 0 });
    expect(rows[0].fulfilment_status).toBe("released");
    expect(state.rpc).toEqual(["release_product_order_stock"]);
    expect(e.released).toHaveBeenCalledWith(expect.objectContaining({ byCustomer: false }));
    expect(await runHoldJob({ db, now: FRI_9AM, pickupHours: null, emails: e })).toEqual({ reminded: 0, released: 0, restocked: 0 });
    expect(state.rpc).toHaveLength(1);
  });

  it("leaves an order alone before its reminder day", async () => {
    const { db, state } = fakeDb([reservation()]);
    const e = emails();
    expect(await runHoldJob({ db, now: new Date("2026-11-24T15:00:00Z"), pickupHours: null, emails: e })).toEqual({ reminded: 0, released: 0, restocked: 0 });
    expect(state.rpc).toEqual([]);
  });

  it("ignores reservations already paid", async () => {
    const { db } = fakeDb([reservation({ payment_status: "paid" })]);
    expect(await runHoldJob({ db, now: FRI_9AM, pickupHours: null, emails: emails() })).toEqual({ reminded: 0, released: 0, restocked: 0 });
  });
});

describe("stock that never came back", () => {
  it("is returned by the daily sweep for closed orders", async () => {
    const { db, state } = fakeDb([
      reservation({ id: "a", fulfilment_status: "released", stock_taken: true, stock_released_at: null }),
      reservation({ id: "b", fulfilment_status: "released", stock_taken: true, stock_released_at: "2026-11-24T00:00:00Z" }),
      reservation({ id: "c", payment_method: "card", fulfilment_status: "cancelled", stock_taken: false, stock_released_at: null }),
    ]);
    const out = await runHoldJob({ db, now: WED_9AM, pickupHours: null, emails: emails() });
    expect(out.restocked).toBe(1);
    expect(state.rpc).toEqual(["release_product_order_stock"]);
  });
});

describe("hold job wiring", () => {
  it("runs daily from vercel.json and checks the cron secret", () => {
    const vercel = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));
    expect(vercel.crons).toContainEqual({ path: "/api/cron/product-holds", schedule: "0 15 * * *" });
    const route = readFileSync(join(process.cwd(), "app/api/cron/product-holds/route.ts"), "utf8");
    expect(route).toContain("CRON_SECRET");
    expect(route).toContain("runHoldJob(");
  });
});
