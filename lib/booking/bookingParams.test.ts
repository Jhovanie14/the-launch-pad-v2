import { describe, expect, it } from "vitest";
import {
  bookingSelectionKey,
  buildBookingSearch,
  parseBookingSelection,
  searchParamsFromRecord,
} from "./bookingParams";

describe("searchParamsFromRecord", () => {
  it("keeps strings, takes the first of repeated values, drops undefined", () => {
    const sp = searchParamsFromRecord({ service: "s1", addons: ["a1,a2", "x"], date: undefined });
    expect(sp.get("service")).toBe("s1");
    expect(sp.get("addons")).toBe("a1,a2");
    expect(sp.has("date")).toBe(false);
  });
});

describe("bookingSelectionKey", () => {
  const base = {
    licensePlate: "ABC123",
    vehicleId: "",
    serviceId: "s1",
    addOnIds: ["a1", "a2"],
    date: "2026-11-20",
    time: "9:30",
  };

  it("ignores date and time", () => {
    expect(bookingSelectionKey(base)).toBe(bookingSelectionKey({ ...base, date: null, time: "10:00" }));
  });

  it("changes with the service, add-ons, plate or vehicle id", () => {
    const k = bookingSelectionKey(base);
    expect(bookingSelectionKey({ ...base, serviceId: "s2" })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, addOnIds: ["a1"] })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, licensePlate: "XYZ" })).not.toBe(k);
    expect(bookingSelectionKey({ ...base, vehicleId: "v1" })).not.toBe(k);
  });
});

describe("parseBookingSelection", () => {
  it("parses a full param set", () => {
    const sp = new URLSearchParams(
      "license_plate=ABC123&vehicle_id=v1&service=s1&addons=a1,a2&date=2026-06-15&time=9:30"
    );
    expect(parseBookingSelection(sp)).toEqual({
      licensePlate: "ABC123",
      vehicleId: "v1",
      serviceId: "s1",
      addOnIds: ["a1", "a2"],
      date: "2026-06-15",
      time: "9:30",
    });
  });

  it('scrubs literal "null"/"undefined" and empty values', () => {
    const sp = new URLSearchParams("license_plate=null&vehicle_id=undefined&addons=");
    const sel = parseBookingSelection(sp);
    expect(sel.licensePlate).toBe("");
    expect(sel.vehicleId).toBe("");
    expect(sel.addOnIds).toEqual([]);
    expect(sel.serviceId).toBeNull();
    expect(sel.date).toBeNull();
    expect(sel.time).toBeNull();
  });

  it("filters empty add-on ids from trailing commas", () => {
    const sp = new URLSearchParams("addons=a1,,a2,");
    expect(parseBookingSelection(sp).addOnIds).toEqual(["a1", "a2"]);
  });
});

describe("buildBookingSearch", () => {
  it("omits empty fields", () => {
    const search = buildBookingSearch({
      licensePlate: "",
      vehicleId: "",
      serviceId: "s1",
      addOnIds: [],
      date: null,
      time: null,
    });
    expect(search).toBe("service=s1");
  });

  it("round-trips through parse", () => {
    const sel = {
      licensePlate: "ABC123",
      vehicleId: "v1",
      serviceId: "s1",
      addOnIds: ["a1", "a2"],
      date: "2026-06-15",
      time: "9:30",
    };
    expect(parseBookingSelection(new URLSearchParams(buildBookingSearch(sel)))).toEqual(sel);
  });
});
