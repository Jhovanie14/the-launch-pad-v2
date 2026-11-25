import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = () => readFileSync(join(process.cwd(), "app/(dashboard)/dashboard/orders/page.tsx"), "utf8");

describe("customer orders page", () => {
  it("keeps a shipped parcel open, with its tracking pass, until it's delivered", () => {
    expect(read()).toMatch(/const isOpen = \(o: OrderWithItems\) =>[\s\S]{0,200}out_for_delivery/);
  });

  it("open orders are pickup passes, with cancel for reservations", () => {
    const s = read();
    expect(s).toContain("PickupPass");
    expect(s).toContain("CancelReservationButton");
    expect(s).toContain("customerCanCancel(");
  });

  it("reads the new order states, never status", () => {
    const s = read();
    expect(s).toContain("fulfilment_status");
    expect(s).not.toMatch(/\.status\b/);
    expect(s).not.toContain("ready_for_pickup");
  });

  it("progress reads Placed, Ready, Picked up", () => {
    const s = read();
    for (const step of ['"Placed"', '"Ready"', '"Picked up"']) expect(s).toContain(step);
  });

  it("no stale delivery promise", () => {
    expect(read()).not.toContain("local delivery");
  });
});
