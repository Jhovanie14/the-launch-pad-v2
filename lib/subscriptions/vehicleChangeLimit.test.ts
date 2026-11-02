import { describe, expect, it } from "vitest";
import { addMonths, vehicleChangeLock, type VehicleChangeEvent } from "./vehicleChangeLimit";

const NOW = new Date("2026-10-23T12:00:00.000Z");

function ev(kind: VehicleChangeEvent["kind"], iso: string): VehicleChangeEvent {
  return { kind, created_at: iso };
}

describe("vehicleChangeLock", () => {
  it("is unlocked with no history", () => {
    expect(vehicleChangeLock([], NOW)).toEqual({ locked: false });
  });

  it("never locks pure additions", () => {
    const events = [ev("added", "2026-09-01T00:00:00Z"), ev("added", "2026-10-01T00:00:00Z")];
    expect(vehicleChangeLock(events, NOW)).toEqual({ locked: false });
  });

  it("does not lock on a removal alone (removing is always allowed)", () => {
    expect(vehicleChangeLock([ev("removed", "2026-10-01T00:00:00Z")], NOW)).toEqual({ locked: false });
  });

  it("locks after remove-then-add, until 6 months after the earlier event", () => {
    const events = [ev("removed", "2026-08-10T00:00:00Z"), ev("added", "2026-08-12T00:00:00Z")];
    expect(vehicleChangeLock(events, NOW)).toEqual({
      locked: true,
      lastChangeAt: new Date("2026-08-12T00:00:00Z"),
      unlocksAt: new Date("2027-02-10T00:00:00Z"),
    });
  });

  it("locks after add-then-remove too (the order can't be used to dodge it)", () => {
    const events = [ev("added", "2026-09-01T00:00:00Z"), ev("removed", "2026-09-03T00:00:00Z")];
    expect(vehicleChangeLock(events, NOW)).toMatchObject({
      locked: true,
      unlocksAt: new Date("2027-03-01T00:00:00Z"),
    });
  });

  it("ignores events older than 6 months", () => {
    const events = [ev("removed", "2026-04-01T00:00:00Z"), ev("added", "2026-10-01T00:00:00Z")];
    expect(vehicleChangeLock(events, NOW)).toEqual({ locked: false });
  });

  it("uses the most recent add and removal for the unlock date", () => {
    const events = [
      ev("removed", "2026-05-01T00:00:00Z"),
      ev("added", "2026-05-02T00:00:00Z"),
      ev("removed", "2026-09-01T00:00:00Z"),
      ev("added", "2026-09-02T00:00:00Z"),
    ];
    expect(vehicleChangeLock(events, NOW)).toMatchObject({
      locked: true,
      lastChangeAt: new Date("2026-09-02T00:00:00Z"),
      unlocksAt: new Date("2027-03-01T00:00:00Z"),
    });
  });

  it("a staff unlock clears everything before it", () => {
    const events = [
      ev("removed", "2026-09-01T00:00:00Z"),
      ev("added", "2026-09-02T00:00:00Z"),
      ev("unlocked", "2026-10-01T00:00:00Z"),
    ];
    expect(vehicleChangeLock(events, NOW)).toEqual({ locked: false });
  });

  it("locks again on a fresh change after an unlock", () => {
    const events = [
      ev("removed", "2026-09-01T00:00:00Z"),
      ev("added", "2026-09-02T00:00:00Z"),
      ev("unlocked", "2026-10-01T00:00:00Z"),
      ev("removed", "2026-10-10T00:00:00Z"),
      ev("added", "2026-10-11T00:00:00Z"),
    ];
    expect(vehicleChangeLock(events, NOW)).toMatchObject({
      locked: true,
      unlocksAt: new Date("2027-04-10T00:00:00Z"),
    });
  });
});

describe("addMonths", () => {
  it("moves by calendar months", () => {
    expect(addMonths(new Date("2026-08-12T00:00:00Z"), 6)).toEqual(new Date("2027-02-12T00:00:00Z"));
    expect(addMonths(new Date("2026-10-23T12:00:00Z"), -6)).toEqual(new Date("2026-04-23T12:00:00Z"));
  });
});
