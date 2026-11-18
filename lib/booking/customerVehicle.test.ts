import { describe, expect, it } from "vitest";
import { customerVehicleId } from "./customerVehicle";

function fakeDb(rows: { vehicle?: any; sub?: any; onPlan?: any }) {
  return {
    from(table: string) {
      const q: any = {
        select: () => q,
        eq: () => q,
        limit: () => q,
        maybeSingle: async () => ({
          data:
            table === "vehicles" ? rows.vehicle ?? null
            : table === "user_subscription" ? rows.sub ?? null
            : table === "subscription_vehicles" ? rows.onPlan ?? null
            : null,
        }),
      };
      return q;
    },
  } as any;
}

describe("customerVehicleId", () => {
  it("keeps the customer's own car", async () => {
    const db = fakeDb({ vehicle: { id: "v1", user_id: "u1" } });
    expect(await customerVehicleId(db, "u1", "v1")).toBe("v1");
  });

  it("keeps a car on the customer's membership", async () => {
    const db = fakeDb({ vehicle: { id: "v1", user_id: null }, sub: { id: "s1" }, onPlan: { id: "sv1" } });
    expect(await customerVehicleId(db, "u1", "v1")).toBe("v1");
  });

  it("drops someone else's car", async () => {
    const db = fakeDb({ vehicle: { id: "v1", user_id: "u2" }, sub: { id: "s1" }, onPlan: null });
    expect(await customerVehicleId(db, "u1", "v1")).toBeNull();
  });

  it("drops a made-up id, and any id from a guest", async () => {
    expect(await customerVehicleId(fakeDb({}), "u1", "nope")).toBeNull();
    expect(await customerVehicleId(fakeDb({ vehicle: { id: "v1", user_id: null } }), null, "v1")).toBeNull();
  });
});
