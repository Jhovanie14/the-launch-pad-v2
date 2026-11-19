import { describe, expect, it } from "vitest";
import { pendingCartPayload, restorePendingCart } from "./pendingCart";

describe("pending membership cart (sign-in hand-off)", () => {
  it("round trip keeps the plates", () => {
    const raw = pendingCartPayload(["ABC 1234", "XYZ 9876"], "plan-1", "monthly");
    expect(restorePendingCart(raw)).toEqual({ plates: ["ABC 1234", "XYZ 9876"] });
  });

  it("old entries with isAuthorized and autoCheckout restore plates only", () => {
    const old = JSON.stringify({
      vehicles: [{ license_plate: " abc 1234 " }],
      isAuthorized: true,
      planId: "plan-1",
      billingCycle: "monthly",
      autoCheckout: true,
    });
    expect(restorePendingCart(old)).toEqual({ plates: ["abc 1234"] });
  });

  it("corrupt JSON → null", () => {
    expect(restorePendingCart("{not json")).toBeNull();
    expect(restorePendingCart(null)).toBeNull();
  });

  it("no vehicles → null", () => {
    expect(restorePendingCart(JSON.stringify({ vehicles: [] }))).toBeNull();
    expect(restorePendingCart(JSON.stringify({ planId: "x" }))).toBeNull();
  });

  it("more than 5 plates are cut to 5", () => {
    const raw = JSON.stringify({ vehicles: ["A", "B", "C", "D", "E", "F", "G"].map((p) => ({ license_plate: p })) });
    expect(restorePendingCart(raw)?.plates).toHaveLength(5);
  });

  it("payload never contains isAuthorized or autoCheckout", () => {
    const parsed = JSON.parse(pendingCartPayload(["ABC 1234"], "plan-1", "yearly"));
    expect(parsed).not.toHaveProperty("isAuthorized");
    expect(parsed).not.toHaveProperty("autoCheckout");
    expect(parsed).toEqual({ vehicles: [{ license_plate: "ABC 1234" }], planId: "plan-1", billingCycle: "yearly" });
  });
});
