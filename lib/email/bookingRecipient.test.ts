import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http/apiError";
import { parseBookingId, recipientFromBooking } from "./bookingRecipient";

const BOOKING_ID = "3f2b8c1e-9a4d-4e7b-8c2a-1d5e6f7a8b9c";

describe("parseBookingId", () => {
  it("returns the id when the body carries a uuid bookingId", () => {
    expect(parseBookingId({ bookingId: BOOKING_ID })).toBe(BOOKING_ID);
  });

  it("rejects a missing bookingId with a 400", () => {
    expect(() => parseBookingId({})).toThrow(ApiError);
    expect(() => parseBookingId({})).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it("rejects a bookingId that is not a uuid (e.g. a query-string payload)", () => {
    expect(() =>
      parseBookingId({ bookingId: "x&redirect=https://evil.example" })
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it("rejects a non-object body", () => {
    expect(() => parseBookingId(null)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});

describe("recipientFromBooking", () => {
  it("returns the email and name stored on the booking", () => {
    expect(
      recipientFromBooking({
        id: BOOKING_ID,
        customer_email: "owner@example.com",
        customer_name: "Sam",
      })
    ).toEqual({ id: BOOKING_ID, email: "owner@example.com", name: "Sam" });
  });

  it("throws a 404 when the booking does not exist", () => {
    expect(() => recipientFromBooking(null)).toThrow(
      expect.objectContaining({ status: 404 })
    );
  });

  it("throws a 422 when the booking has no customer email", () => {
    expect(() =>
      recipientFromBooking({
        id: BOOKING_ID,
        customer_email: null,
        customer_name: "Sam",
      })
    ).toThrow(expect.objectContaining({ status: 422 }));
  });

  it("falls back to an empty name when the booking has none", () => {
    expect(
      recipientFromBooking({
        id: BOOKING_ID,
        customer_email: "owner@example.com",
        customer_name: null,
      }).name
    ).toBe("");
  });
});
