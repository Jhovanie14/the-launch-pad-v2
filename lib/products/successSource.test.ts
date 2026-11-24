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

  it("only asks to show the reference while the order is open", () => {
    expect(read(PASS)).toMatch(/open && \(\s*<p[^>]*>Show this reference at the counter/);
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
