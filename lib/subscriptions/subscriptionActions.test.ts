import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/stripe/stripe", () => ({
  stripe: {
    subscriptions: { retrieve: vi.fn() },
    prices: { retrieve: vi.fn(), list: vi.fn(), create: vi.fn() },
    subscriptionItems: { create: vi.fn(), del: vi.fn() },
  },
}));
vi.mock("@/utils/vehicle", () => ({ ensureVehicle: vi.fn() }));
vi.mock("@/lib/email/subscription-emails", () => ({
  sendFamilyVehicleAddedEmail: vi.fn(),
  sendFamilyVehicleRemovedEmail: vi.fn(),
  sendPrimaryVehicleSwappedEmail: vi.fn(),
}));

import { stripe } from "@/lib/stripe/stripe";
import { ensureVehicle } from "@/utils/vehicle";
import { ApiError } from "@/lib/http/apiError";
import { addSubscriptionVehicle } from "./subscriptionActions";

const USER = "11111111-1111-1111-1111-111111111111";
const ADMIN = { kind: "admin", adminId: "admin-1", reason: "Customer came into the shop" } as const;
const CUSTOMER = { kind: "customer" } as const;

/** A recent remove + add — the customer has used their 6-month change. */
const LOCKED_HISTORY = [
  { kind: "removed", created_at: new Date(Date.now() - 20 * 864e5).toISOString() },
  { kind: "added", created_at: new Date(Date.now() - 19 * 864e5).toISOString() },
];

/**
 * Minimal chainable Supabase fake. Reads resolve from `reads[table]`
 * (maybeSingle → the value; awaited list queries → the value as an array);
 * inserts are recorded and fail with `insertErrors[table]` when set.
 */
function fakeDb(opts: {
  reads: Record<string, unknown>;
  insertErrors?: Record<string, unknown>;
}) {
  const inserts: { table: string; row: any }[] = [];
  const db = {
    auth: {
      admin: { getUserById: async () => ({ data: { user: { email: "customer@example.com" } } }) },
    },
    from(table: string) {
      const value = opts.reads[table] ?? null;
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => ({ data: Array.isArray(value) ? (value[0] ?? null) : value, error: null }),
        then: (resolve: (r: unknown) => void) =>
          resolve({ data: Array.isArray(value) ? value : value ? [value] : [], error: null }),
        insert: async (row: any) => {
          inserts.push({ table, row });
          return { error: opts.insertErrors?.[table] ?? null };
        },
      };
      return builder;
    },
  } as any;
  return { db, inserts };
}

function activeSub(vehicleCount: number) {
  return {
    id: "sub-row-1",
    stripe_subscription_id: "sub_123",
    subscription_plan_id: "plan-1",
    billing_cycle: "month",
    subscription_vehicles: Array.from({ length: vehicleCount }, (_, i) => ({ id: `sv-${i}` })),
  };
}

const baseReads = (history: unknown[] = []) => ({
  user_subscription: activeSub(1),
  subscription_vehicle_changes: history,
  vehicles: null,
  subscription_vehicles: null,
  subscription_plans: {
    name: "Unlimited",
    is_commercial: false,
    stripe_price_id_monthly: "price_base",
    stripe_price_id_yearly: null,
  },
  profiles: { full_name: "Pat Customer" },
});

beforeEach(() => {
  vi.mocked(stripe.subscriptions.retrieve).mockReset().mockResolvedValue({
    items: {
      data: [
        {
          id: "si_primary",
          price: {
            id: "price_base",
            product: "prod_1",
            unit_amount: 5999,
            currency: "usd",
            recurring: { interval: "month", interval_count: 1 },
          },
        },
      ],
    },
  } as any);
  vi.mocked(stripe.prices.retrieve).mockReset().mockResolvedValue({ unit_amount: 5999 } as any);
  vi.mocked(stripe.prices.list).mockReset().mockResolvedValue({ data: [] } as any);
  vi.mocked(stripe.prices.create).mockReset().mockResolvedValue({ id: "price_flock" } as any);
  vi.mocked(stripe.subscriptionItems.create).mockReset().mockResolvedValue({ id: "si_new" } as any);
  vi.mocked(stripe.subscriptionItems.del).mockReset().mockResolvedValue({} as any);
  vi.mocked(ensureVehicle).mockReset().mockResolvedValue("veh-new");
});

describe("addSubscriptionVehicle", () => {
  it("refuses a customer who has used their 6-month change, before touching Stripe", async () => {
    const { db, inserts } = fakeDb({ reads: baseReads(LOCKED_HISTORY) });

    const err = await addSubscriptionVehicle(db, USER, "abc123", CUSTOMER).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toMatch(/already changed a vehicle/);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("lets staff add past the lock and records it as their change", async () => {
    const { db, inserts } = fakeDb({ reads: baseReads(LOCKED_HISTORY) });

    const result = await addSubscriptionVehicle(db, USER, " abc123 ", ADMIN);

    expect(result).toEqual({ vehicleId: "veh-new", licensePlate: "ABC123", stripeSubscriptionId: "sub_123" });
    expect(stripe.subscriptionItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ subscription: "sub_123", price: "price_flock", proration_behavior: "create_prorations" }),
    );
    expect(inserts).toContainEqual({
      table: "subscription_vehicle_changes",
      row: expect.objectContaining({
        user_id: USER,
        kind: "added",
        actor: "admin",
        admin_id: "admin-1",
        license_plate: "ABC123",
        note: "Customer came into the shop",
      }),
    });
  });

  it("bills the family rate on a personal plan", async () => {
    const { db } = fakeDb({ reads: baseReads() });

    await addSubscriptionVehicle(db, USER, "ABC123", CUSTOMER);

    expect(stripe.prices.create).toHaveBeenCalledWith(expect.objectContaining({ unit_amount: 3899 }));
  });

  it("takes the Stripe item back off when the vehicle can't be linked", async () => {
    const { db, inserts } = fakeDb({
      reads: baseReads(),
      insertErrors: { subscription_vehicles: { message: "boom" } },
    });

    const err = await addSubscriptionVehicle(db, USER, "ABC123", CUSTOMER).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith("si_new", { proration_behavior: "none" });
    expect(inserts.some((i) => i.table === "subscription_vehicle_changes")).toBe(false);
  });

  it("takes the Stripe item back off when the vehicle record can't be created", async () => {
    vi.mocked(ensureVehicle).mockRejectedValue(new Error("db down"));
    const { db } = fakeDb({ reads: baseReads() });

    const err = await addSubscriptionVehicle(db, USER, "ABC123", CUSTOMER).catch((e) => e);

    expect(err.status).toBe(500);
    expect(stripe.subscriptionItems.del).toHaveBeenCalledWith("si_new", { proration_behavior: "none" });
  });

  it("refuses a plate that is on another active membership, for staff too", async () => {
    const { db, inserts } = fakeDb({
      reads: { ...baseReads(), subscription_vehicles: [{ subscription_id: "someone-elses-sub" }] },
    });

    const err = await addSubscriptionVehicle(db, USER, "ABC123", ADMIN).catch((e) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(409);
    expect(err.message).toMatch(/already on another active membership/);
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
    expect(inserts).toEqual([]);
  });

  it("says so when the plate is already on this subscription", async () => {
    const { db } = fakeDb({
      reads: { ...baseReads(), subscription_vehicles: [{ subscription_id: "sub-row-1" }] },
    });

    const err = await addSubscriptionVehicle(db, USER, "ABC123", CUSTOMER).catch((e) => e);

    expect(err.status).toBe(400);
    expect(err.message).toBe("This vehicle is already on this subscription");
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });

  it("enforces the vehicle cap for staff too", async () => {
    const { db } = fakeDb({ reads: { ...baseReads(), user_subscription: activeSub(5) } });

    const err = await addSubscriptionVehicle(db, USER, "ABC123", ADMIN).catch((e) => e);

    expect(err.status).toBe(400);
    expect(stripe.subscriptionItems.create).not.toHaveBeenCalled();
  });

  it("rejects an empty plate", async () => {
    const { db } = fakeDb({ reads: baseReads() });

    const err = await addSubscriptionVehicle(db, USER, "   ", ADMIN).catch((e) => e);

    expect(err.status).toBe(400);
    expect(err.message).toBe("License plate is required");
  });
});
