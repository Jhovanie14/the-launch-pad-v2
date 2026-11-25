import { describe, expect, it } from "vitest";
import { pickUspsRate, quoteShipping, type ShipAddress } from "./quote";

const ADDRESS: ShipAddress = {
  name: "Dee Jones",
  street1: "215 Clayton St",
  street2: "",
  city: "San Francisco",
  state: "CA",
  zip: "94117",
  phone: "4155550100",
};

const RATES = [
  { object_id: "r_exp", provider: "USPS", amount: "54.36", estimated_days: 2, servicelevel: { token: "usps_priority_express", name: "Priority Mail Express" } },
  { object_id: "r_ga", provider: "USPS", amount: "8.08", estimated_days: 4, servicelevel: { token: "usps_ground_advantage", name: "Ground Advantage" } },
  { object_id: "r_pri", provider: "USPS", amount: "13.57", estimated_days: 3, servicelevel: { token: "usps_priority", name: "Priority Mail" } },
  { object_id: "r_ups", provider: "UPS", amount: "7.10", estimated_days: 5, servicelevel: { token: "ups_ground", name: "Ground" } },
];

function fakeShippo(opts: { valid?: boolean; rates?: unknown[]; failShipment?: boolean } = {}) {
  const calls: { method: string; path: string; body?: any }[] = [];
  const shippo = async (method: "GET" | "POST", path: string, body?: any) => {
    calls.push({ method, path, body });
    if (path === "/addresses/") {
      return opts.valid === false
        ? { validation_results: { is_valid: false, messages: [{ text: "Unable to find a valid city, state or 5-digit zip." }] } }
        : { ...body, street1: "215 CLAYTON ST", zip: "94117-2214", validation_results: { is_valid: true, messages: [] } };
    }
    if (path === "/shipments/") {
      if (opts.failShipment) throw new Error("shippo down");
      return { status: "SUCCESS", rates: opts.rates ?? RATES };
    }
    throw new Error("unexpected " + path);
  };
  return { shippo, calls };
}

function fakeDb(products: { id: string; name: string; weight_oz: number | null }[], settings: unknown = {}) {
  return {
    from(table: string) {
      if (table === "products") return { select: () => ({ in: async () => ({ data: products, error: null }) }) };
      if (table === "store_settings") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settings, error: null }) }) }) };
      throw new Error(table);
    },
  } as never;
}

const TOWEL = { id: "p1", name: "Utility towels", weight_oz: 16 };
const ONE = [{ productId: "p1", quantity: 1 }];

describe("pickUspsRate", () => {
  it("prefers Ground Advantage, otherwise the cheapest USPS", () => {
    expect(pickUspsRate(RATES as never)?.object_id).toBe("r_ga");
    expect(pickUspsRate(RATES.filter((r) => r.object_id !== "r_ga") as never)?.object_id).toBe("r_pri");
    expect(pickUspsRate(RATES.filter((r) => r.provider === "UPS") as never)).toBeNull();
  });
});

describe("quoteShipping", () => {
  it("returns the USPS Ground Advantage price for the cart", async () => {
    const { shippo, calls } = fakeShippo();
    const q = await quoteShipping({ shippo, db: fakeDb([TOWEL]) }, ONE, ADDRESS);
    expect(q).toEqual({
      amount: 8.08,
      service: "USPS Ground Advantage",
      rateId: "r_ga",
      days: 4,
      address: { ...ADDRESS, street1: "215 CLAYTON ST", zip: "94117-2214" },
    });
    const shipment = calls.find((c) => c.path === "/shipments/")!;
    expect(shipment.body.parcels[0]).toMatchObject({ weight: "16", mass_unit: "oz" });
    expect(shipment.body.address_from.city).toBe("Houston");
    expect(shipment.body.async).toBe(false);
  });

  it("refuses an address USPS can't confirm, with the reasons", async () => {
    const { shippo, calls } = fakeShippo({ valid: false });
    await expect(quoteShipping({ shippo, db: fakeDb([TOWEL]) }, ONE, ADDRESS)).rejects.toMatchObject({
      status: 400,
      message: "We couldn't confirm this address",
      details: { messages: ["Unable to find a valid city, state or 5-digit zip."] },
    });
    expect(calls.some((c) => c.path === "/shipments/")).toBe(false);
  });

  it("refuses a product without a weight before calling Shippo", async () => {
    const { shippo, calls } = fakeShippo();
    await expect(quoteShipping({ shippo, db: fakeDb([{ ...TOWEL, weight_oz: null }]) }, ONE, ADDRESS)).rejects.toMatchObject({
      status: 400,
      message: "Shipping isn't available for Utility towels yet. Choose pickup.",
    });
    expect(calls).toEqual([]);
  });

  it("refuses an excluded or non-state address before calling Shippo", async () => {
    const { shippo, calls } = fakeShippo();
    await expect(
      quoteShipping({ shippo, db: fakeDb([TOWEL], { shipping_excluded_states: ["CA"] }) }, ONE, ADDRESS),
    ).rejects.toMatchObject({ status: 400, message: "We can't ship to this address yet. Choose pickup or contact us." });
    await expect(quoteShipping({ shippo, db: fakeDb([TOWEL]) }, ONE, { ...ADDRESS, state: "PR" })).rejects.toMatchObject({ status: 400 });
    expect(calls).toEqual([]);
  });

  it("refuses an incomplete address", async () => {
    const { shippo } = fakeShippo();
    await expect(quoteShipping({ shippo, db: fakeDb([TOWEL]) }, ONE, { ...ADDRESS, zip: "941" })).rejects.toMatchObject({
      status: 400,
      message: "Enter the full address, including a 5-digit ZIP",
    });
  });

  it("is unavailable when there are no USPS rates or Shippo fails", async () => {
    const none = fakeShippo({ rates: RATES.filter((r) => r.provider === "UPS") });
    await expect(quoteShipping({ shippo: none.shippo, db: fakeDb([TOWEL]) }, ONE, ADDRESS)).rejects.toMatchObject({
      status: 503,
      message: "Shipping is not available right now",
    });
    const down = fakeShippo({ failShipment: true });
    await expect(quoteShipping({ shippo: down.shippo, db: fakeDb([TOWEL]) }, ONE, ADDRESS)).rejects.toMatchObject({ status: 503 });
  });

  it("refuses an empty cart or an unknown product", async () => {
    const { shippo } = fakeShippo();
    await expect(quoteShipping({ shippo, db: fakeDb([TOWEL]) }, [], ADDRESS)).rejects.toMatchObject({ status: 400 });
    await expect(quoteShipping({ shippo, db: fakeDb([]) }, ONE, ADDRESS)).rejects.toMatchObject({ status: 400 });
  });
});
