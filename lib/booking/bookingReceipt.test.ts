import { describe, expect, it } from "vitest";
import { buildReceipt, successActionFor } from "./bookingReceipt";

// What production stores: bookings.service_package_price is the price charged
// for the service (sale applied, 0 when a membership covers it); the list
// price comes from service_packages; extras are list prices.
const base = {
  paymentMethod: "card" as const,
  serviceName: "Classic Complete",
  serviceListPrice: 45,
  serviceChargedPrice: 42.75 as number | null,
  extras: [] as { name: string; price: number }[],
  totalPaid: 42.75,
  date: "2026-11-21",
  time: "10:30",
  durationMin: 40,
  plate: "ABC 1234",
  vehicle: null,
  bookingId: "b-1",
  paymentIntentId: "pi_123",
  saleActive: true,
  saleDiscount: 0.05,
};

describe("buildReceipt", () => {
  it("sale, card, with extras → list prices and one Holiday sale row", () => {
    const r = buildReceipt({ ...base, extras: [{ name: "Tire shine", price: 10 }], totalPaid: 52.25 });
    expect(r.servicePrice).toBe(45);
    expect(r.discounts).toEqual([{ label: "Holiday sale (5% off)", amount: 2.75 }]);
    expect(r.total).toBe(52.25);
    expect(r.title).toBe("Payment received, you're booked");
    expect(r.paidWith).toBe("Paid by card");
  });

  it("sale, no extras → the sale still shows", () => {
    const r = buildReceipt(base);
    expect(r.discounts).toEqual([{ label: "Holiday sale (5% off)", amount: 2.25 }]);
  });

  it("sale plus a promo → a sale row and a Discount row that add up", () => {
    const r = buildReceipt({ ...base, paymentMethod: "cash", extras: [{ name: "Tire shine", price: 10 }], totalPaid: 47.03 });
    expect(r.discounts).toEqual([
      { label: "Holiday sale (5% off)", amount: 2.75 },
      { label: "Discount", amount: 5.22 },
    ]);
    expect(r.paidWith).toBe("Pay cash at your visit");
    expect(r.title).toBe("You're booked");
  });

  it("no sale → one Discount row for a promo", () => {
    const r = buildReceipt({ ...base, saleActive: false, serviceChargedPrice: 45, totalPaid: 40.5 });
    expect(r.discounts).toEqual([{ label: "Discount", amount: 4.5 }]);
  });

  it("member's free wash (cash path) → Free, no discount rows, total 0", () => {
    const r = buildReceipt({ ...base, paymentMethod: "subscription", serviceChargedPrice: 0, totalPaid: 0 });
    expect(r.serviceFree).toBe(true);
    expect(r.discounts).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.kind).toBe("membership");
    expect(r.paidWith).toBe("Free with your membership");
  });

  it("member's free wash with extras paid by card → service Free, extras charged with the sale", () => {
    const r = buildReceipt({
      ...base,
      serviceChargedPrice: 0,
      extras: [{ name: "Tire shine", price: 10 }],
      totalPaid: 9.5,
    });
    expect(r.serviceFree).toBe(true);
    expect(r.discounts).toEqual([{ label: "Holiday sale (5% off)", amount: 0.5 }]);
    expect(r.total).toBe(9.5);
    expect(r.paidWith).toBe("Paid by card");
  });

  it("an unknown payment method with a charged price is not shown as free", () => {
    const r = buildReceipt({ ...base, paymentMethod: null });
    expect(r.serviceFree).toBe(false);
  });

  it("no booking yet → reference 'Payment pi_123'; with a booking → 'Booking b-1'", () => {
    expect(buildReceipt({ ...base, bookingId: null }).reference).toBe("Payment pi_123");
    expect(buildReceipt(base).reference).toBe("Booking b-1");
  });

  it("missing time, plate, duration → null, never NaN", () => {
    const r = buildReceipt({ ...base, time: null, durationMin: null, plate: null });
    expect(r.time).toBeNull();
    expect(r.durationMin).toBeNull();
    expect(r.plate).toBeNull();
    expect(r.day).toBe("Sat, Nov 21");
    expect(buildReceipt({ ...base, durationMin: Number.NaN }).durationMin).toBeNull();
  });

  it("time formats 9:30 → '9:30 AM' and 17:30 → '5:30 PM'", () => {
    expect(buildReceipt({ ...base, time: "9:30" }).time).toBe("9:30 AM");
    expect(buildReceipt({ ...base, time: "17:30" }).time).toBe("5:30 PM");
    expect(buildReceipt({ ...base, time: "12:00" }).time).toBe("12:00 PM");
  });
});

describe("successActionFor", () => {
  it("signed in → See your bookings; guest → Create a free account", () => {
    expect(successActionFor(true)).toEqual({ href: "/dashboard/bookings", label: "See your bookings" });
    expect(successActionFor(false)).toEqual({ href: "/signup", label: "Create a free account" });
  });
});
