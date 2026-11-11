import { describe, expect, it } from "vitest";
import { normalizePlate, plateError } from "./plate";

describe("plateError", () => {
  it("asks for a plate when it is empty or only spaces", () => {
    expect(plateError("")).toBe("Enter your license plate.");
    expect(plateError("   ")).toBe("Enter your license plate.");
    expect(plateError(undefined)).toBe("Enter your license plate.");
    expect(plateError(" - - ")).toBe("Enter your license plate.");
  });

  it("rejects symbols a plate can't have", () => {
    expect(plateError("AB$123")).toBe("Use letters and numbers only.");
  });

  it("rejects more than 8 characters", () => {
    expect(plateError("ABCD12345")).toBe("A plate has at most 8 letters and numbers.");
  });

  it("accepts real plates with spaces or dashes", () => {
    expect(plateError("ABC 1234")).toBeNull();
    expect(plateError("abc-1234")).toBeNull();
    expect(plateError("7")).toBeNull();
  });
});

describe("normalizePlate", () => {
  it("trims, uppercases and collapses inner spaces", () => {
    expect(normalizePlate("  abc   1234 ")).toBe("ABC 1234");
  });
});
