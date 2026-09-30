import { describe, expect, it } from "vitest";
import { isDetailingOpenOn } from "./detailingDays";

describe("isDetailingOpenOn", () => {
  it("is closed Monday through Wednesday", () => {
    expect(isDetailingOpenOn("2026-10-05")).toBe(false); // Monday
    expect(isDetailingOpenOn("2026-10-06")).toBe(false); // Tuesday
    expect(isDetailingOpenOn("2026-10-07")).toBe(false); // Wednesday
  });

  it("is open Thursday through Sunday", () => {
    expect(isDetailingOpenOn("2026-10-01")).toBe(true); // Thursday
    expect(isDetailingOpenOn("2026-10-02")).toBe(true); // Friday
    expect(isDetailingOpenOn("2026-10-03")).toBe(true); // Saturday
    expect(isDetailingOpenOn("2026-10-04")).toBe(true); // Sunday
  });

  it("rejects malformed or impossible dates", () => {
    expect(isDetailingOpenOn("")).toBe(false);
    expect(isDetailingOpenOn("2026-10-1")).toBe(false);
    expect(isDetailingOpenOn("2026-02-30")).toBe(false);
    expect(isDetailingOpenOn("2026-10-02T00:00:00Z")).toBe(false);
  });
});
