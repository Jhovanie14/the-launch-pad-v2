import { describe, expect, it } from "vitest";
import { describeVehicle } from "./vehicleDisplay";

// Just enough of the query builder for describeVehicle and customerVehicleId:
// select / eq / limit / maybeSingle over fixed rows per table.
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      const preds: ((r: Record<string, unknown>) => boolean)[] = [];
      const q: any = {
        select: () => q,
        eq: (c: string, v: unknown) => (preds.push((r) => r[c] === v), q),
        limit: () => q,
        maybeSingle: async () => ({
          data: (tables[table] ?? []).find((r) => preds.every((p) => p(r))) ?? null,
          error: null,
        }),
      };
      return q;
    },
  } as any;
}

const civic = {
  id: "v1",
  user_id: "u1",
  year: 2020,
  make: "Honda",
  model: "Civic",
  body_type: "Sedan",
  colors: ["Blue"],
  license_plate: "ABC 123",
};
const db = fakeDb({ vehicles: [civic], user_subscription: [], subscription_vehicles: [] });

describe("describeVehicle", () => {
  it("a guest gets only the plate they typed", async () => {
    expect(await describeVehicle(db, null, { licensePlate: "abc 123" })).toEqual({
      year: null,
      make: null,
      model: null,
      body_type: null,
      colors: null,
      license_plate: "ABC 123",
    });
  });

  it("the owner gets the car's details", async () => {
    const car = await describeVehicle(db, "u1", { licensePlate: "ABC 123" });
    expect(car?.make).toBe("Honda");
    expect(car?.colors).toEqual(["Blue"]);
  });

  it("someone else's car gives just the plate", async () => {
    const car = await describeVehicle(db, "u2", { licensePlate: "ABC 123" });
    expect(car).toEqual(expect.objectContaining({ make: null, license_plate: "ABC 123" }));
  });

  it("someone else's car by id gives nothing, so an id never turns into a plate", async () => {
    expect(await describeVehicle(db, "u2", { vehicleId: "v1" })).toBeNull();
  });

  it("nothing to describe gives null", async () => {
    expect(await describeVehicle(db, "u1", {})).toBeNull();
  });
});
