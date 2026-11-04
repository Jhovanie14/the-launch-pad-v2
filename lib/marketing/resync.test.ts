import { describe, expect, it, vi } from "vitest";
import { resyncUnsynced } from "./resync";

function fakeDb(rows: { id: string; email: string; status: string }[]) {
  const query = {
    filters: [] as unknown[],
    order: null as unknown,
    limit: 0,
  };
  const updates: { values: Record<string, unknown>; id: unknown }[] = [];
  const db = {
    from: vi.fn(() => ({
      select: () => {
        const chain = {
          is: (col: string, val: unknown) => {
            query.filters.push([col, val]);
            return chain;
          },
          order: (col: string, opts: unknown) => {
            query.order = [col, opts];
            return chain;
          },
          limit: async (n: number) => {
            query.limit = n;
            return { data: rows, error: null };
          },
        };
        return chain;
      },
      update: (values: Record<string, unknown>) => ({
        eq: async (_col: string, id: unknown) => {
          updates.push({ values, id });
          return { error: null };
        },
      }),
    })),
  };
  return { db: db as any, query, updates };
}

describe("resyncUnsynced", () => {
  it("syncs unsynced rows and stamps resend_synced_at", async () => {
    const { db, query, updates } = fakeDb([
      { id: "a", email: "a@example.com", status: "subscribed" },
      { id: "b", email: "b@example.com", status: "unsubscribed" },
    ]);
    const sync = vi.fn(async (c: { email: string }) => c.email === "a@example.com");

    const result = await resyncUnsynced(db, sync, 50);

    expect(query.filters).toContainEqual(["resend_synced_at", null]);
    expect(query.order).toEqual(["updated_at", { ascending: true }]);
    expect(query.limit).toBe(50);
    expect(sync).toHaveBeenCalledWith({ email: "a@example.com", subscribed: true });
    expect(sync).toHaveBeenCalledWith({ email: "b@example.com", subscribed: false });
    expect(updates).toHaveLength(1);
    expect(updates[0].id).toBe("a");
    expect(typeof updates[0].values.resend_synced_at).toBe("string");
    expect(result).toEqual({ attempted: 2, synced: 1 });
  });

  it("defaults to 100 rows per run", async () => {
    const { db, query } = fakeDb([]);
    await expect(resyncUnsynced(db, vi.fn())).resolves.toEqual({ attempted: 0, synced: 0 });
    expect(query.limit).toBe(100);
  });
});
