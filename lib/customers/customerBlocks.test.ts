import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/apiError";
import {
  CUSTOMER_BLOCKED_MESSAGE,
  assertNotBlocked,
  blockCustomer,
  findCustomerBlock,
  unblockCustomer,
} from "./customerBlocks";

function fakeDb(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn(async () => ({ data: result.data ?? [], error: result.error ?? null }));
  return { db: { rpc } as any, rpc };
}

describe("findCustomerBlock", () => {
  it("passes the email and trimmed, non-empty plates to the database lookup", async () => {
    const { db, rpc } = fakeDb({ data: [] });
    await findCustomerBlock(db, { email: " pat@example.com ", plates: [" ABC 1234 ", "", null] });
    expect(rpc).toHaveBeenCalledWith("find_customer_block", {
      p_email: "pat@example.com",
      p_plates: ["ABC 1234"],
    });
  });

  it("returns the match", async () => {
    const { db } = fakeDb({ data: [{ kind: "license_plate", value: "ABC 1234" }] });
    await expect(findCustomerBlock(db, { plates: ["ABC1234"] })).resolves.toEqual({
      kind: "license_plate",
      value: "ABC 1234",
    });
  });

  it("skips the lookup when there is nothing to check", async () => {
    const { db, rpc } = fakeDb({ data: [] });
    await expect(findCustomerBlock(db, { email: "  ", plates: [] })).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails open when the lookup errors", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = fakeDb({ error: { message: "function does not exist" } });
    await expect(findCustomerBlock(db, { email: "a@b.com" })).resolves.toBeNull();
    spy.mockRestore();
  });
});

describe("assertNotBlocked", () => {
  it("throws a 403 without saying which detail matched", async () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { db } = fakeDb({ data: [{ kind: "email", value: "pat@example.com" }] });
    const err = await assertNotBlocked(db, { email: "pat@example.com" }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe(CUSTOMER_BLOCKED_MESSAGE);
    spy.mockRestore();
  });

  it("passes when nothing matches", async () => {
    const { db } = fakeDb({ data: [] });
    await expect(assertNotBlocked(db, { email: "ok@example.com", plates: ["ABC123"] })).resolves.toBeUndefined();
  });
});

const USER = "22222222-2222-2222-2222-222222222222";
const ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

/** Chainable fake: reads resolve from `reads[table]`; upserts and deletes are recorded. */
function tableDb(opts: { reads: Record<string, unknown>; email?: string | null; upsertError?: unknown }) {
  const upserts: { rows: any[]; options: any }[] = [];
  const deletes: { table: string; filters: [string, unknown][] }[] = [];
  const db = {
    auth: {
      admin: {
        getUserById: async () => ({ data: { user: opts.email === null ? null : { email: opts.email ?? "pat@example.com" } } }),
      },
    },
    from(table: string) {
      const value = opts.reads[table] ?? null;
      const filters: [string, unknown][] = [];
      let deleting = false;
      const builder: any = {
        select: () => builder,
        eq: (col: string, v: unknown) => (filters.push([col, v]), builder),
        delete: () => ((deleting = true), builder),
        maybeSingle: async () => ({ data: Array.isArray(value) ? (value[0] ?? null) : value, error: null }),
        upsert: async (rows: any[], options: any) => {
          upserts.push({ rows, options });
          return { error: opts.upsertError ?? null };
        },
        then: (resolve: (r: unknown) => void) => {
          if (deleting) deletes.push({ table, filters });
          resolve({ data: Array.isArray(value) ? value : value ? [value] : [], error: null });
        },
      };
      return builder;
    },
  } as any;
  return { db, upserts, deletes };
}

describe("blockCustomer", () => {
  const reads = {
    profiles: { email: "pat@example.com", role: "user" },
    user_subscription: [
      { subscription_vehicles: [{ vehicles: { license_plate: "ABC 1234" } }] },
      { subscription_vehicles: [{ vehicles: { license_plate: "abc123" } }] },
    ],
    self_service_subscriptions: [{ self_service_subscription_vehicles: [{ vehicles: { license_plate: "ABC 1234" } }] }],
    vehicles: [{ license_plate: " def456 " }, { license_plate: null }],
  };

  it("blocks the email and every plate the customer has used, once each", async () => {
    const { db, upserts } = tableDb({ reads });

    const result = await blockCustomer(db, USER, ADMIN, "Business decision");

    expect(result).toEqual({ email: "pat@example.com", plates: ["ABC 1234", "ABC123", "DEF456"] });
    expect(upserts).toHaveLength(1);
    expect(upserts[0].options).toEqual({ onConflict: "kind,normalized", ignoreDuplicates: true });
    expect(upserts[0].rows).toEqual([
      { kind: "email", value: "pat@example.com", user_id: USER, admin_id: ADMIN, reason: "Business decision" },
      { kind: "license_plate", value: "ABC 1234", user_id: USER, admin_id: ADMIN, reason: "Business decision" },
      { kind: "license_plate", value: "ABC123", user_id: USER, admin_id: ADMIN, reason: "Business decision" },
      { kind: "license_plate", value: "DEF456", user_id: USER, admin_id: ADMIN, reason: "Business decision" },
    ]);
  });

  it("refuses to block staff", async () => {
    const { db, upserts } = tableDb({ reads: { ...reads, profiles: { email: "s@x.com", role: "admin" } } });
    const err = await blockCustomer(db, USER, ADMIN, "x").catch((e) => e);
    expect(err.status).toBe(400);
    expect(upserts).toEqual([]);
  });

  it("refuses to block your own account", async () => {
    const { db } = tableDb({ reads });
    const err = await blockCustomer(db, ADMIN, ADMIN, "x").catch((e) => e);
    expect(err.status).toBe(400);
  });

  it("reports a failed save", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db } = tableDb({ reads, upsertError: { message: "boom" } });
    const err = await blockCustomer(db, USER, ADMIN, "x").catch((e) => e);
    expect(err.status).toBe(500);
    spy.mockRestore();
  });
});

describe("unblockCustomer", () => {
  it("removes every block made for this customer", async () => {
    const { db, deletes } = tableDb({ reads: { customer_blocks: [{ id: "1" }, { id: "2" }] } });

    await expect(unblockCustomer(db, USER)).resolves.toBe(2);
    expect(deletes).toEqual([{ table: "customer_blocks", filters: [["user_id", USER]] }]);
  });
});
