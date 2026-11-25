import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPickupSettings, sanitizePickupSettings } from "./storeSettings";

describe("sanitizePickupSettings", () => {
  it("trims the hours and keeps a valid hold", () => {
    expect(sanitizePickupSettings({ pickup_hours: "  Thu–Sun, 9:30 AM–6:30 PM ", hold_days: 3 })).toEqual({
      pickupHours: "Thu–Sun, 9:30 AM–6:30 PM",
      pickupNote: null,
      holdDays: 3,
    });
  });
  it("trims the pickup note", () => {
    expect(sanitizePickupSettings({ pickup_hours: "x", pickup_note: "  Ask for Armando  ", hold_days: 3 }).pickupNote).toBe("Ask for Armando");
  });
  it("saves an empty or missing note as not set", () => {
    for (const pickup_note of ["   ", null, undefined]) {
      expect(sanitizePickupSettings({ pickup_hours: "x", pickup_note, hold_days: 3 }).pickupNote, String(pickup_note)).toBeNull();
    }
  });
  it("refuses a note over 200 characters", () => {
    expect(() => sanitizePickupSettings({ pickup_hours: "", pickup_note: "x".repeat(201), hold_days: 3 })).toThrow(
      "Keep pickup instructions to 200 characters",
    );
    expect(sanitizePickupSettings({ pickup_hours: "", pickup_note: "x".repeat(200), hold_days: 3 }).pickupNote).toHaveLength(200);
  });
  it("refuses a note that isn't text", () => {
    expect(() => sanitizePickupSettings({ pickup_hours: "", pickup_note: 5, hold_days: 3 })).toThrow("Pickup instructions must be text");
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
  const selected: string[] = [];
  const db = (row: unknown) => ({
    from: () => ({
      select: (cols: string) => (selected.push(cols), { eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
    }),
  });

  it("reads the saved settings", async () => {
    expect(await getPickupSettings(db({ pickup_hours: "Daily 9–6", pickup_note: " Ask for Armando ", hold_days: 5 }) as never)).toEqual({
      pickupHours: "Daily 9–6",
      pickupNote: "Ask for Armando",
      holdDays: 5,
    });
  });
  it("still returns the hours before the note column exists", async () => {
    expect(await getPickupSettings(db({ pickup_hours: "Daily 9–6", hold_days: 5 }) as never)).toEqual({
      pickupHours: "Daily 9–6",
      pickupNote: null,
      holdDays: 5,
    });
    // Selecting "*" means a missing pickup_note column can't fail the read.
    expect(selected.at(-1)).toBe("*");
  });
  it("falls back when the row or columns are missing", async () => {
    expect(await getPickupSettings(db(null) as never)).toEqual({ pickupHours: null, pickupNote: null, holdDays: 3 });
    expect(await getPickupSettings(db({}) as never)).toEqual({ pickupHours: null, pickupNote: null, holdDays: 3 });
  });
});

describe("pickup settings route", () => {
  it("never goes through the hero sanitiser", () => {
    const src = readFileSync(join(process.cwd(), "app/api/admin/store-settings/pickup/route.ts"), "utf8");
    expect(src).not.toContain("sanitizeHeroSettings");
    expect(src).toContain("requireAdmin");
    expect(src).toContain("sanitizePickupSettings");
    expect(src).toContain("pickup_note: settings.pickupNote");
  });
});
