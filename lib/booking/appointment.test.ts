import { describe, expect, it } from "vitest";
import { BOOKING_TIME_SLOTS, validateAppointment } from "./appointment";
import { DETAILING_CLOSED_MESSAGE } from "./detailingDays";

// Wed 18 Nov 2026, 10:15 AM in Houston (CST = UTC-6).
const NOW = new Date("2026-11-18T16:15:00Z");

describe("validateAppointment", () => {
  it("accepts an open day in the future at a real slot", () => {
    expect(validateAppointment("2026-11-19", "9:30", NOW)).toBeNull(); // Thursday
    expect(validateAppointment("2026-11-22", "17:30", NOW)).toBeNull(); // Sunday
  });

  it("refuses Monday through Wednesday", () => {
    expect(validateAppointment("2026-11-23", "10:00", NOW)).toBe(DETAILING_CLOSED_MESSAGE); // Monday
    expect(validateAppointment("2026-11-25", "10:00", NOW)).toBe(DETAILING_CLOSED_MESSAGE); // Wednesday
  });

  it("refuses a date that has passed in Houston", () => {
    expect(validateAppointment("2026-11-15", "10:00", NOW)).toMatch(/passed/); // last Sunday
  });

  it("refuses a time that is not one of the slots", () => {
    expect(validateAppointment("2026-11-19", "8:00", NOW)).toMatch(/time/i);
    expect(validateAppointment("2026-11-19", "9:45", NOW)).toMatch(/time/i);
    expect(validateAppointment("2026-11-19", "18:00", NOW)).toMatch(/time/i);
    expect(validateAppointment("2026-11-19", "", NOW)).toMatch(/time/i);
    expect(validateAppointment("2026-11-19", "banana", NOW)).toMatch(/time/i);
  });

  it("accepts a leading zero on the hour", () => {
    expect(validateAppointment("2026-11-19", "09:30", NOW)).toBeNull();
  });

  it("refuses a slot earlier today, in Houston time", () => {
    // Thu 19 Nov, 11:05 AM Houston.
    const thursdayMorning = new Date("2026-11-19T17:05:00Z");
    expect(validateAppointment("2026-11-19", "11:00", thursdayMorning)).toMatch(/passed/);
    expect(validateAppointment("2026-11-19", "11:30", thursdayMorning)).toBeNull();
  });

  it("uses Houston's date, not UTC's, late in the evening", () => {
    // Thu 19 Nov 9 PM Houston is already Fri 20 Nov in UTC; Friday is still bookable.
    const thursdayNight = new Date("2026-11-20T03:00:00Z");
    expect(validateAppointment("2026-11-20", "9:30", thursdayNight)).toBeNull();
  });

  it("refuses dates more than 180 days ahead", () => {
    expect(validateAppointment("2027-06-03", "10:00", NOW)).toMatch(/180 days/); // a Thursday
  });

  it("keeps the last start at 5:30 PM", () => {
    expect(BOOKING_TIME_SLOTS[0]).toBe("9:30");
    expect(BOOKING_TIME_SLOTS.at(-1)).toBe("17:30");
  });
});
