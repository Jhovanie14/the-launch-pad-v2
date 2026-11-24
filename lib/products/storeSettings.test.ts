import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPickupSettings, sanitizePickupSettings } from "./storeSettings";

describe("sanitizePickupSettings", () => {
  it("trims the hours and keeps a valid hold", () => {
    expect(sanitizePickupSettings({ pickup_hours: "  Thu–Sun, 9:30 AM–6:30 PM ", hold_days: 3 })).toEqual({
      pickupHours: "Thu–Sun, 9:30 AM–6:30 PM",
      holdDays: 3,
    });
  });
  it("saves empty hours as not set", () => {
    expect(sanitizePickupSettings({ pickup_hours: "   ", hold_days: 1 }).pickupHours).toBeNull();
    expect(sanitizePickupSettings({ pickup_hours: null, hold_days: 14 }).pickupHours).toBeNull();
  });
  it("refuses hours over 120 characters", () => {
    expect(() => sanitizePickupSettings({ pickup_hours: "x".repeat(121), hold_days: 3 })).toThrow();
  });
  it("refuses a hold outside 1 to 14 whole days", () => {
    for (const hold_days of [0, 15, 2.5, "3", null, undefined]) {
      expect(() => sanitizePickupSettings({ pickup_hours: "", hold_days }), String(hold_days)).toThrow();
    }
  });
  it("refuses a body that isn't an object", () => {
    expect(() => sanitizePickupSettings(null)).toThrow();
  });
});

describe("getPickupSettings", () => {
  const db = (row: unknown) => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }),
  });

  it("reads the saved settings", async () => {
    expect(await getPickupSettings(db({ pickup_hours: "Daily 9–6", hold_days: 5 }) as never)).toEqual({
      pickupHours: "Daily 9–6",
      holdDays: 5,
    });
  });
  it("falls back when the row or columns are missing", async () => {
    expect(await getPickupSettings(db(null) as never)).toEqual({ pickupHours: null, holdDays: 3 });
    expect(await getPickupSettings(db({}) as never)).toEqual({ pickupHours: null, holdDays: 3 });
  });
});

describe("pickup settings route", () => {
  it("never goes through the hero sanitiser", () => {
    const src = readFileSync(join(process.cwd(), "app/api/admin/store-settings/pickup/route.ts"), "utf8");
    expect(src).not.toContain("sanitizeHeroSettings");
    expect(src).toContain("requireAdmin");
    expect(src).toContain("sanitizePickupSettings");
  });
});
