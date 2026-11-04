import { describe, expect, it, vi } from "vitest";
import { getConsentStatus, recordConsent } from "./consent";

const ROW_ID = "row-1";

function fakeDb(opts: { blocked?: boolean; stored?: { status: string } | null } = {}) {
  const calls = {
    upserts: [] as { row: Record<string, unknown>; opts: Record<string, unknown> }[],
    updates: [] as { values: Record<string, unknown>; col: string; val: unknown }[],
    rpc: [] as { name: string; args: Record<string, unknown> }[],
    selects: [] as { col: string; val: unknown }[],
  };
  const db = {
    rpc: vi.fn(async (name: string, args: Record<string, unknown>) => {
      calls.rpc.push({ name, args });
      if (name === "find_customer_block") {
        return { data: opts.blocked ? [{ kind: "email", value: "x" }] : [], error: null };
      }
      if (name === "normalize_block_email") {
        return { data: String(args.p_email).trim().toLowerCase(), error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn(() => ({
      upsert: (row: Record<string, unknown>, o: Record<string, unknown>) => {
        calls.upserts.push({ row, opts: o });
        return { select: () => ({ single: async () => ({ data: { id: ROW_ID }, error: null }) }) };
      },
      update: (values: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          calls.updates.push({ values, col, val });
          return { error: null };
        },
      }),
      select: () => ({
        eq: (col: string, val: unknown) => {
          calls.selects.push({ col, val });
          return { maybeSingle: async () => ({ data: opts.stored ?? null, error: null }) };
        },
      }),
    })),
  };
  return { db: db as any, calls };
}

const okSync = () => vi.fn(async () => true);

describe("recordConsent", () => {
  it("subscribes: upserts on normalized_email with status, source and subscribed_at", async () => {
    const { db, calls } = fakeDb();
    const result = await recordConsent(
      db,
      { email: "  sam@example.com ", action: "subscribe", source: "booking" },
      { sync: okSync() },
    );
    expect(result.outcome).toBe("subscribed");
    expect(calls.upserts).toHaveLength(1);
    const { row, opts } = calls.upserts[0];
    expect(opts.onConflict).toBe("normalized_email");
    expect(row.email).toBe("sam@example.com");
    expect(row.status).toBe("subscribed");
    expect(row.source).toBe("booking");
    expect(typeof row.subscribed_at).toBe("string");
    expect(new Date(row.subscribed_at as string).toISOString()).toBe(row.subscribed_at);
    expect(row.resend_synced_at).toBeNull();
  });

  it("unsubscribes: sets status and unsubscribed_at", async () => {
    const { db, calls } = fakeDb();
    const result = await recordConsent(
      db,
      { email: "sam@example.com", action: "unsubscribe", source: "settings" },
      { sync: okSync() },
    );
    expect(result.outcome).toBe("unsubscribed");
    const { row } = calls.upserts[0];
    expect(row.status).toBe("unsubscribed");
    expect(typeof row.unsubscribed_at).toBe("string");
    expect("subscribed_at" in row).toBe(false);
  });

  it("does not subscribe a blocked email", async () => {
    const { db, calls } = fakeDb({ blocked: true });
    const sync = okSync();
    const result = await recordConsent(
      db,
      { email: "sam@example.com", action: "subscribe", source: "booking" },
      { sync },
    );
    expect(result).toEqual({ outcome: "skipped_blocked", synced: false });
    expect(calls.upserts).toHaveLength(0);
    expect(sync).not.toHaveBeenCalled();
  });

  it("does not check blocks when unsubscribing", async () => {
    const { db, calls } = fakeDb({ blocked: true });
    await recordConsent(db, { email: "sam@example.com", action: "unsubscribe", source: "block" }, { sync: okSync() });
    expect(calls.rpc.filter((r) => r.name === "find_customer_block")).toHaveLength(0);
    expect(calls.upserts).toHaveLength(1);
  });

  it("sets user_id only when given", async () => {
    const withUser = fakeDb();
    await recordConsent(
      withUser.db,
      { email: "sam@example.com", userId: "u1", action: "subscribe", source: "settings" },
      { sync: okSync() },
    );
    expect(withUser.calls.upserts[0].row.user_id).toBe("u1");

    const guest = fakeDb();
    await recordConsent(guest.db, { email: "sam@example.com", action: "subscribe", source: "booking" }, { sync: okSync() });
    expect("user_id" in guest.calls.upserts[0].row).toBe(false);
  });

  it("skips an invalid email", async () => {
    const { db, calls } = fakeDb();
    const result = await recordConsent(db, { email: "not-an-email", action: "subscribe", source: "booking" }, { sync: okSync() });
    expect(result).toEqual({ outcome: "skipped_invalid", synced: false });
    expect(calls.upserts).toHaveLength(0);
    expect(calls.rpc).toHaveLength(0);
  });

  it("marks the row synced when Resend succeeds", async () => {
    const { db, calls } = fakeDb();
    const sync = okSync();
    const result = await recordConsent(
      db,
      { email: "sam@example.com", action: "subscribe", source: "signup", firstName: "Sam" },
      { sync },
    );
    expect(sync).toHaveBeenCalledWith({ email: "sam@example.com", firstName: "Sam", subscribed: true });
    expect(result).toEqual({ outcome: "subscribed", synced: true });
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0].col).toBe("id");
    expect(calls.updates[0].val).toBe(ROW_ID);
    expect(typeof calls.updates[0].values.resend_synced_at).toBe("string");
  });

  it("keeps the row unsynced when Resend reports failure", async () => {
    const { db, calls } = fakeDb();
    const result = await recordConsent(
      db,
      { email: "sam@example.com", action: "subscribe", source: "signup" },
      { sync: vi.fn(async () => false) },
    );
    expect(result).toEqual({ outcome: "subscribed", synced: false });
    expect(calls.updates).toHaveLength(0);
  });

  it("does not throw when the Resend sync throws", async () => {
    const { db } = fakeDb();
    const result = await recordConsent(
      db,
      { email: "sam@example.com", action: "subscribe", source: "signup" },
      {
        sync: vi.fn(async () => {
          throw new Error("boom");
        }),
      },
    );
    expect(result).toEqual({ outcome: "subscribed", synced: false });
  });
});

describe("getConsentStatus", () => {
  it("returns the stored status, matched on the normalized email", async () => {
    const { db, calls } = fakeDb({ stored: { status: "unsubscribed" } });
    await expect(getConsentStatus(db, " Sam@Example.com ")).resolves.toBe("unsubscribed");
    expect(calls.rpc[0]).toEqual({ name: "normalize_block_email", args: { p_email: "Sam@Example.com" } });
    expect(calls.selects[0]).toEqual({ col: "normalized_email", val: "sam@example.com" });
  });

  it("returns null when there is no row", async () => {
    const { db } = fakeDb({ stored: null });
    await expect(getConsentStatus(db, "sam@example.com")).resolves.toBeNull();
  });
});
