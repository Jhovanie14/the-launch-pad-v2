import { describe, expect, it } from "vitest";
import { addDays, bookingDateRange, bookingSearchOr, cleanSearchTerm, houstonToday } from "./bookingQuery";

describe("houstonToday", () => {
  it("uses the Houston calendar date, not UTC", () => {
    // 03:00 UTC on Nov 7 is still 9 PM on Nov 6 in Houston.
    expect(houstonToday(new Date("2026-11-07T03:00:00Z"))).toBe("2026-11-06");
    expect(houstonToday(new Date("2026-11-07T18:00:00Z"))).toBe("2026-11-07");
  });
});

describe("addDays", () => {
  it("moves calendar dates across month ends", () => {
    expect(addDays("2026-11-28", 7)).toBe("2026-12-05");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("bookingDateRange", () => {
  const today = "2026-11-06";
  it("all → no bounds", () => {
    expect(bookingDateRange("all", today)).toEqual({});
  });
  it("today → that one day", () => {
    expect(bookingDateRange("today", today)).toEqual({ gte: today, lte: today });
  });
  it("week / month look ahead, inclusive", () => {
    expect(bookingDateRange("week", today)).toEqual({ gte: today, lte: "2026-11-13" });
    expect(bookingDateRange("month", today)).toEqual({ gte: today, lte: "2026-12-06" });
  });
  it("lastWeek / lastMonth look back and exclude today", () => {
    expect(bookingDateRange("lastWeek", today)).toEqual({ gte: "2026-10-30", lt: today });
    expect(bookingDateRange("lastMonth", today)).toEqual({ gte: "2026-10-07", lt: today });
  });
});

describe("cleanSearchTerm", () => {
  it("strips characters that would break or widen a PostgREST filter", () => {
    expect(cleanSearchTerm("  smith, (x)*%\\ ")).toBe("smith x");
  });
  it("returns empty for blank input", () => {
    expect(cleanSearchTerm("   ")).toBe("");
  });
});

describe("bookingSearchOr", () => {
  it("returns null with no term", () => {
    expect(bookingSearchOr("", [])).toBeNull();
  });
  it("matches name, email and service, plus matching vehicles", () => {
    expect(bookingSearchOr("ab 12", ["v1", "v2"])).toBe(
      "customer_name.ilike.%ab 12%,customer_email.ilike.%ab 12%,service_package_name.ilike.%ab 12%,vehicle_id.in.(v1,v2)",
    );
  });
  it("matches a booking by its full id", () => {
    const id = "1a2b3c4d-1111-2222-3333-444455556666";
    expect(bookingSearchOr(id, [])).toContain(`id.eq.${id}`);
  });
});
