import { describe, expect, it } from "vitest";
import { canTransition, nextActionFor, orderStatusLabel } from "./orderStatus";

describe("canTransition", () => {
  it("follows the pickup path", () => {
    expect(canTransition("pending", "paid", "pickup")).toBe(true);
    expect(canTransition("paid", "ready_for_pickup", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "completed", "pickup")).toBe(true);
  });

  it("follows the delivery path", () => {
    expect(canTransition("paid", "out_for_delivery", "delivery")).toBe(true);
    expect(canTransition("out_for_delivery", "completed", "delivery")).toBe(true);
  });

  it("blocks the wrong fulfillment branch", () => {
    expect(canTransition("paid", "out_for_delivery", "pickup")).toBe(false);
    expect(canTransition("paid", "ready_for_pickup", "delivery")).toBe(false);
  });

  it("allows refund from paid and both in-progress states", () => {
    expect(canTransition("paid", "refunded", "pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "refunded", "pickup")).toBe(true);
    expect(canTransition("out_for_delivery", "refunded", "delivery")).toBe(true);
  });

  it("blocks transitions out of terminal states and skips", () => {
    expect(canTransition("completed", "refunded", "pickup")).toBe(false);
    expect(canTransition("cancelled", "paid", "pickup")).toBe(false);
    expect(canTransition("refunded", "completed", "delivery")).toBe(false);
    expect(canTransition("pending", "completed", "pickup")).toBe(false);
    expect(canTransition("paid", "completed", "pickup")).toBe(false);
  });
});

describe("nextActionFor", () => {
  it("offers the fulfillment-specific step from paid", () => {
    expect(nextActionFor({ status: "paid", fulfillment_method: "pickup" })).toEqual({
      to: "ready_for_pickup",
      label: "Mark ready for pickup",
    });
    expect(nextActionFor({ status: "paid", fulfillment_method: "delivery" })).toEqual({
      to: "out_for_delivery",
      label: "Mark out for delivery",
    });
  });

  it("offers completion from in-progress states", () => {
    expect(
      nextActionFor({ status: "ready_for_pickup", fulfillment_method: "pickup" }),
    ).toEqual({ to: "completed", label: "Mark completed" });
    expect(
      nextActionFor({ status: "out_for_delivery", fulfillment_method: "delivery" }),
    ).toEqual({ to: "completed", label: "Mark completed" });
  });

  it("returns null for pending and terminal states", () => {
    expect(nextActionFor({ status: "pending", fulfillment_method: "pickup" })).toBeNull();
    expect(nextActionFor({ status: "completed", fulfillment_method: "pickup" })).toBeNull();
    expect(nextActionFor({ status: "refunded", fulfillment_method: "delivery" })).toBeNull();
    expect(nextActionFor({ status: "cancelled", fulfillment_method: "pickup" })).toBeNull();
  });
});

describe("orderStatusLabel", () => {
  it("maps statuses to display text", () => {
    expect(orderStatusLabel("ready_for_pickup")).toBe("Ready for pickup");
    expect(orderStatusLabel("out_for_delivery")).toBe("Out for delivery");
    expect(orderStatusLabel("paid")).toBe("Paid");
    expect(orderStatusLabel("weird")).toBe("weird");
  });
});
