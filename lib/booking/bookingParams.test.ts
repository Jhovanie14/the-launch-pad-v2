import { describe, expect, it } from "vitest";
import { buildBookingSearch, parseBookingSelection } from "./bookingParams";

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
