import { describe, expect, it, vi } from "vitest";
import { fakeDb } from "@/lib/marketing/testing/fakeDb";
import { bookingSelectionKey, type BookingSelection } from "./bookingParams";
import { loadBookingStep } from "./loadBookingStep";

const tables = {
  service_packages: [
    { id: "s1", is_active: true, created_at: "2", name: "Wash", price: 30 },
    { id: "s0", is_active: true, created_at: "1", name: "Rinse", price: 20 },
    { id: "sx", is_active: false, created_at: "3", name: "Old", price: 10 },
  ],
  add_ons: [
    { id: "a1", is_active: true, created_at: "1", name: "Wax", price: 5 },
    { id: "a2", is_active: true, created_at: "2", name: "Tyres", price: 5 },
  ],
};

const selection: BookingSelection = {
  licensePlate: "ABC123",
  vehicleId: "",
  serviceId: "s1",
  addOnIds: ["a1"],
  date: "2026-11-20",
  time: "9:30",
};

const member = { id: "u1", email: "m@example.com", fullName: "Member" };
const plan = { id: "sub1", status: "active" } as any;
const car = { year: 2020, make: "Honda", model: "Civic", body_type: null, colors: null, license_plate: "ABC123" };

function deps(overrides: Partial<Parameters<typeof loadBookingStep>[0]> = {}) {
  return {
    selection,
    db: fakeDb(tables),
    user: member,
    getSubscription: vi.fn(async () => plan),
    getVehicle: vi.fn(async () => car),
    ...overrides,
  } as Parameters<typeof loadBookingStep>[0];
}

describe("loadBookingStep", () => {
  it("service step: active catalog in created order, plus the chosen service and add-ons", async () => {
    const args = deps({ step: "service" });
    const data = await loadBookingStep(args);
    expect(data.catalog?.services.map((s) => s.id)).toEqual(["s0", "s1"]);
    expect(data.catalog?.addOns.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(data.service?.id).toBe("s1");
    expect(data.addOns.map((a) => a.id)).toEqual(["a1"]);
    expect(data.vehicleInfo).toBeNull();
    expect(args.getVehicle).not.toHaveBeenCalled();
    expect(data.selectionKey).toBe(bookingSelectionKey(selection));
    expect(data.user).toEqual(member);
    expect(data.subscription).toBe(plan);
  });

  it("datetime step: no catalog and no car lookup", async () => {
    const args = deps({ step: "datetime" });
    const data = await loadBookingStep(args);
    expect(data.catalog).toBeNull();
    expect(args.getVehicle).not.toHaveBeenCalled();
    expect(data.service?.id).toBe("s1");
  });

  it("confirmation step: car details for the signed-in user", async () => {
    const args = deps({ step: "confirmation" });
    const data = await loadBookingStep(args);
    expect(args.getVehicle).toHaveBeenCalledWith("u1", { licensePlate: "ABC123", vehicleId: "" });
    expect(data.vehicleInfo).toBe(car);
    expect(data.catalog).toBeNull();
  });

  it("confirmation step with no plate and no vehicle id: no car lookup", async () => {
    const args = deps({ step: "confirmation", selection: { ...selection, licensePlate: "" } });
    const data = await loadBookingStep(args);
    expect(args.getVehicle).not.toHaveBeenCalled();
    expect(data.vehicleInfo).toBeNull();
  });

  it("guest: no membership lookup", async () => {
    const args = deps({ step: "confirmation", user: null });
    const data = await loadBookingStep(args);
    expect(args.getSubscription).not.toHaveBeenCalled();
    expect(data.subscription).toBeNull();
    expect(args.getVehicle).toHaveBeenCalledWith(null, { licensePlate: "ABC123", vehicleId: "" });
  });

  it("membership lookup fails → subscription undefined, not null", async () => {
    const args = deps({
      step: "confirmation",
      getSubscription: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const data = await loadBookingStep(args);
    expect(data.subscription).toBeUndefined();
    expect(data.service?.id).toBe("s1");
  });

  it("unknown add-on ids are dropped and an unknown service is null", async () => {
    const odd = { ...selection, serviceId: "nope", addOnIds: ["a1", "nope"] };
    const data = await loadBookingStep(deps({ step: "datetime", selection: odd }));
    expect(data.service).toBeNull();
    expect(data.addOns.map((a) => a.id)).toEqual(["a1"]);
    expect(data.selectionKey).toBe(bookingSelectionKey(odd));
  });

  it("a failing service query gives selectionKey null", async () => {
    const real = fakeDb(tables);
    const failing = {
      from: (table: string) => {
        if (table !== "service_packages") return real.from(table);
        const q: any = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({ data: null, error: { message: "boom" } }),
        };
        return q;
      },
    } as any;
    const data = await loadBookingStep(deps({ step: "datetime", db: failing }));
    expect(data.selectionKey).toBeNull();
  });

  it("a failing catalog query gives catalog null, so the browser loads it", async () => {
    const real = fakeDb(tables);
    const failing = {
      from: (table: string) => {
        if (table !== "add_ons") return real.from(table);
        const q: any = {
          select: () => q,
          eq: () => q,
          in: () => q,
          order: () => q,
          then: (resolve: (v: unknown) => void) => resolve({ data: null, error: { message: "boom" } }),
        };
        return q;
      },
    } as any;
    const data = await loadBookingStep(deps({ step: "service", db: failing, selection: { ...selection, addOnIds: [] } }));
    expect(data.catalog).toBeNull();
    expect(data.service?.id).toBe("s1");
  });
});
