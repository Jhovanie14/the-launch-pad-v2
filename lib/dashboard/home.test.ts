import { describe, expect, it } from "vitest";
import {
  buildPastVisits,
  formatAppointment,
  membershipStatusLine,
  pickNow,
  rebookHref,
  vehicleLabel,
  type HomeBooking,
  type HomeOrder,
  type HomeUsageLog,
} from "./home";

// Fri Nov 6 2026, 3:00 PM in Houston (all display and "today" logic is in
// the business's time zone, so tests do not depend on the machine's).
const NOW = new Date("2026-11-06T21:00:00Z");

const booking = (over: Partial<HomeBooking>): HomeBooking => ({
  id: "b1",
  status: "confirmed",
  appointment_date: "2026-11-08",
  appointment_time: "10:30:00",
  service_package_id: "svc-1",
  service_package_name: "Express Detail",
  vehicle_id: "v1",
  completed_at: null,
  created_at: "2026-11-01T12:00:00Z",
  vehicle: { year: 2021, make: "Honda", model: "Civic", license_plate: "ABC1234" },
  ...over,
});

const log = (over: Partial<HomeUsageLog>): HomeUsageLog => ({
  id: "l1",
  check_in_time: "2026-11-06T20:14:00Z",
  check_out_time: null,
  status: "in_progress",
  vehicle: null,
  ...over,
});

const order = (over: Partial<HomeOrder>): HomeOrder => ({
  id: "o1",
  status: "paid",
  fulfillment_method: "pickup",
  total: 24.99,
  created_at: "2026-11-05T12:00:00Z",
  ...over,
});

describe("formatAppointment", () => {
  it("writes the day out with the time, in local time", () => {
    expect(formatAppointment("2026-11-08", "10:30:00")).toBe("Sun, Nov 8 · 10:30 AM");
  });

  it("does not shift the date across time zones", () => {
    // A bare date parsed as UTC would show Nov 7 in Houston.
    expect(formatAppointment("2026-11-08", null)).toBe("Sun, Nov 8");
  });

  it("accepts H:MM times", () => {
    expect(formatAppointment("2026-11-08", "9:05")).toBe("Sun, Nov 8 · 9:05 AM");
  });
});

describe("vehicleLabel", () => {
  it("joins year, make and model", () => {
    expect(vehicleLabel({ year: 2021, make: "Honda", model: "Civic" })).toBe("2021 Honda Civic");
  });

  it("skips missing parts and handles no vehicle", () => {
    expect(vehicleLabel({ year: null, make: "Honda", model: null })).toBe("Honda");
    expect(vehicleLabel(null)).toBe("");
  });
});

describe("membershipStatusLine", () => {
  it("says active through the period end", () => {
    expect(
      membershipStatusLine({ current_period_end: "2026-12-04T18:00:00Z", cancel_at_period_end: false }),
    ).toBe("Active through Dec 4, 2026");
  });

  it("says when it ends if cancellation is scheduled", () => {
    expect(
      membershipStatusLine({ current_period_end: "2026-12-04T18:00:00Z", cancel_at_period_end: true }),
    ).toBe("Ends Dec 4, 2026");
  });

  it("falls back to Active without a period end", () => {
    expect(membershipStatusLine({ current_period_end: null, cancel_at_period_end: false })).toBe("Active");
  });
});

describe("pickNow", () => {
  it("puts an open self-service check-in first", () => {
    const now = pickNow({ bookings: [booking({})], logs: [log({})], orders: [order({ status: "ready_for_pickup" })], now: NOW });
    expect(now?.kind).toBe("checked_in");
  });

  it("then the soonest upcoming booking", () => {
    const later = booking({ id: "late", appointment_date: "2026-11-15" });
    const soon = booking({ id: "soon", appointment_date: "2026-11-08" });
    const now = pickNow({ bookings: [later, soon], logs: [], orders: [], now: NOW });
    expect(now).toMatchObject({ kind: "upcoming", booking: { id: "soon" } });
  });

  it("counts a booking later today as upcoming", () => {
    const today = booking({ appointment_date: "2026-11-06", appointment_time: "17:00:00" });
    expect(pickNow({ bookings: [today], logs: [], orders: [], now: NOW })?.kind).toBe("upcoming");
  });

  it("keeps today's booking after its start time (running late, or being detailed)", () => {
    const startedAt9 = booking({ appointment_date: "2026-11-06", appointment_time: "09:00:00" });
    expect(pickNow({ bookings: [startedAt9], logs: [], orders: [], now: NOW })?.kind).toBe("upcoming");
    const inProgress = booking({ status: "in_progress", appointment_date: "2026-11-05" });
    expect(pickNow({ bookings: [inProgress], logs: [], orders: [], now: NOW })?.kind).toBe("upcoming");
  });

  it("ignores a bay session left open from an earlier day", () => {
    const stale = log({ check_in_time: "2026-11-04T15:00:00Z" });
    expect(pickNow({ bookings: [], logs: [stale], orders: [], now: NOW })).toBeNull();
  });

  it("ignores past, cancelled and completed bookings", () => {
    const now = pickNow({
      bookings: [
        booking({ appointment_date: "2026-11-01" }),
        booking({ status: "cancelled" }),
        booking({ status: "completed" }),
      ],
      logs: [log({ check_out_time: "2026-11-06T21:00:00Z", status: "completed" })],
      orders: [],
      now: NOW,
    });
    expect(now).toBeNull();
  });

  it("then an order ready for pickup or out for delivery", () => {
    expect(pickNow({ bookings: [], logs: [], orders: [order({ status: "ready_for_pickup" })], now: NOW })?.kind).toBe(
      "order_ready",
    );
    expect(
      pickNow({ bookings: [], logs: [], orders: [order({ status: "out_for_delivery", fulfillment_method: "delivery" })], now: NOW })
        ?.kind,
    ).toBe("order_on_the_way");
  });
});

describe("buildPastVisits", () => {
  it("merges completed details, finished bay visits and completed orders, newest first", () => {
    const visits = buildPastVisits({
      bookings: [
        booking({ id: "d1", status: "completed", completed_at: "2026-11-02T18:00:00Z" }),
        booking({ id: "d2", status: "confirmed" }),
      ],
      logs: [log({ id: "s1", check_in_time: "2026-11-04T15:00:00Z", check_out_time: "2026-11-04T15:25:00Z", status: "completed" })],
      orders: [order({ id: "o1", status: "completed", created_at: "2026-10-30T12:00:00Z" }), order({ id: "o2", status: "pending" })],
    });
    expect(visits.map((v) => v.id)).toEqual(["s1", "d1", "o1"]);
    expect(visits.map((v) => v.kind)).toEqual(["self_service", "detail", "order"]);
    expect(visits[0]).toMatchObject({ title: "Self-service bay", detail: "25 min" });
    expect(visits[1]).toMatchObject({ title: "Express Detail", detail: "2021 Honda Civic" });
  });

  it("limits the list", () => {
    const many = Array.from({ length: 9 }, (_, i) =>
      booking({ id: `d${i}`, status: "completed", completed_at: `2026-10-0${i + 1}T12:00:00Z` }),
    );
    expect(buildPastVisits({ bookings: many, logs: [], orders: [] }, 5)).toHaveLength(5);
  });
});

describe("rebookHref", () => {
  it("goes straight to date and time with the same service and car", () => {
    // The plate is what the booking flow uses to recognise a car on the membership.
    expect(rebookHref(booking({}))).toBe(
      "/dashboard/booking/datetime?license_plate=ABC1234&vehicle_id=v1&service=svc-1",
    );
  });

  it("starts at service choice when the service is unknown", () => {
    expect(rebookHref(booking({ service_package_id: null }))).toBe("/dashboard/booking/service");
  });
});
