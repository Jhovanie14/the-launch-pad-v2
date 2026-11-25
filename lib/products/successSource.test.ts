import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the confirmation page and the Pickup Pass (Vitest
// has no DOM here).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const PAGE = "app/(user)/products/success/page.tsx";
const PASS = "components/products/PickupPass.tsx";
const CONFIRMING = "app/(user)/products/success/ConfirmingPayment.tsx";
const CANCEL = "components/products/CancelReservationButton.tsx";
const RAW_PALETTE = /\b(?:bg|text|border|ring|fill|stroke)-(?:blue|gray|green|amber|red|slate)-\d/g;

describe("success page", () => {
  it("reads the order as the signed-in customer, never with the service role", () => {
    const s = read(PAGE);
    expect(s).not.toContain("createAdminClient");
    expect(s).toContain("@/utils/supabase/server");
    expect(s).toContain("auth.getUser()");
  });

  it("handles a card checkout and a reservation", () => {
    const s = read(PAGE);
    expect(s).toContain("session_id");
    expect(s).toMatch(/\border\b\??:/);
    expect(s).toContain("PickupPass");
  });

  it("takes its headline from the order's state", () => {
    const s = read(PAGE);
    expect(s).toContain("successHeading(order)");
    expect(s).not.toContain("Reserved for pickup");
  });

  it("only reports a purchase once money was paid by card", () => {
    expect(read(PAGE)).toMatch(/payment_status === "paid"[\s\S]{0,120}<TrackPurchase/);
  });

  it("shows a live confirming state while the card payment lands", () => {
    const c = read(CONFIRMING);
    expect(c).toContain("Confirming your payment");
    expect(c).toContain("aria-live");
    expect(c).toContain("router.refresh()");
    expect(c).toContain("Payment is taking longer than usual");
  });

  it("tokens only", () => {
    for (const f of [PAGE, PASS, CONFIRMING, CANCEL]) expect(read(f).match(RAW_PALETTE) ?? [], f).toEqual([]);
  });
});

describe("pickup pass", () => {
  it("is the reference to show at the counter, with the status from the order flow", () => {
    const s = read(PASS);
    expect(s).toContain("Show this reference at the counter");
    expect(s).toContain("customerStatus(");
    expect(s).toContain("isUnpaidReservation(");
    expect(s).toContain("to pay at the counter");
  });
  it("names the counter methods the owner takes", () => {
    expect(read(PASS)).toContain("Cash, card or Zelle.");
    expect(read(PASS)).not.toContain("or QR");
  });

  it("only asks to show the reference while the order is open", () => {
    expect(read(PASS)).toMatch(/open && \(\s*<p[^>]*>Show this reference at the counter/);
  });

  it("shows the owner's pickup note when set, wherever the pass is used", () => {
    expect(read(PASS)).toMatch(/pickupNote\s*&&/);
    expect(read(PASS)).toContain("pickupNote: string | null");
    expect(read("app/(user)/products/success/page.tsx")).toContain("pickupNote={settings.pickupNote}");
    expect(read("app/(dashboard)/dashboard/orders/page.tsx")).toContain("pickupNote={pickupNote}");
  });

  it("only shows hours the owner has set", () => {
    expect(read(PASS)).toMatch(/pickupHours\s*&&/);
  });

  it("cancel asks first and posts to the customer route", () => {
    const s = read(CANCEL);
    expect(s).toContain("AlertDialog");
    expect(s).toContain("/api/products/orders/cancel");
    expect(s).toContain("The items go back on the shelf");
  });
});

describe("shipping pass", () => {
  const SHIP = "components/products/ShippingPass.tsx";
  it("shows where it ships and how tracking arrives", () => {
    const s = read(SHIP);
    expect(s).toContain("We'll email tracking when it ships.");
    expect(s).toContain("Track package");
    expect(s).toContain("Shipping");
    expect(s).not.toContain("Get directions");
  });
  it("is used for shipping orders on the success page and in My orders", () => {
    for (const p of ["app/(user)/products/success/page.tsx", "app/(dashboard)/dashboard/orders/page.tsx"]) {
      const s = read(p);
      expect(s, p).toContain("<ShippingPass");
      expect(s, p).toMatch(/fulfillment_method === "delivery"/);
    }
  });
});
