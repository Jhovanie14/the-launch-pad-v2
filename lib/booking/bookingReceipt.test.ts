import { describe, expect, it } from "vitest";
import { buildReceipt } from "./bookingReceipt";

const base = {
  paymentMethod: "card" as const,
  serviceName: "Classic Complete",
  servicePrice: 45,
  extras: [] as { name: string; price: number }[],
  totalPaid: 45,
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
  it("card, holiday sale → Total paid 52.25 with a 5% sale row", () => {
    const r = buildReceipt({ ...base, extras: [{ name: "Tire shine", price: 10 }], totalPaid: 52.25 });
    expect(r.discount).toEqual({ label: "Holiday sale (5% off)", amount: 2.75 });
    expect(r.total).toBe(52.25);
    expect(r.kind).toBe("card");
    expect(r.title).toBe("Payment received, you're booked");
    expect(r.paidWith).toBe("Paid by card");
  });

  it("cash with a promo → 'Discount' row", () => {
    const r = buildReceipt({ ...base, paymentMethod: "cash", totalPaid: 38.48 });
    expect(r.discount).toEqual({ label: "Discount", amount: 6.52 });
    expect(r.kind).toBe("cash");
    expect(r.title).toBe("You're booked");
    expect(r.paidWith).toBe("Pay cash at your visit");
  });

  it("member's free wash → Free, no discount row, total 0", () => {
    const r = buildReceipt({ ...base, paymentMethod: "subscription", totalPaid: 0 });
    expect(r.serviceFree).toBe(true);
    expect(r.discount).toBeNull();
    expect(r.total).toBe(0);
    expect(r.kind).toBe("membership");
    expect(r.paidWith).toBe("Free with your membership");
    expect(r.title).toBe("You're booked");
  });

  it("member's free wash with extras → extras paid, total matches", () => {
    const r = buildReceipt({
      ...base,
      paymentMethod: "subscription",
      extras: [{ name: "Tire shine", price: 10 }],
      totalPaid: 10,
    });
    expect(r.discount).toBeNull();
    expect(r.total).toBe(10);
    expect(r.extras).toEqual([{ name: "Tire shine", price: 10 }]);
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
