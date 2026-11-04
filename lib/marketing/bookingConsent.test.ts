import { describe, expect, it } from "vitest";
import { bookingMetaOptsIn } from "./bookingConsent";

describe("bookingMetaOptsIn", () => {
  it("opts in a guest booking with mk: 1 and an email", () => {
    expect(bookingMetaOptsIn({ uid: null, em: "sam@example.com", mk: 1 })).toBe(true);
  });

  it("does not opt in when mk is missing", () => {
    expect(bookingMetaOptsIn({ uid: null, em: "sam@example.com" })).toBe(false);
  });

  it("does not opt in a signed-in booking even with mk", () => {
    expect(bookingMetaOptsIn({ uid: "u1", em: "sam@example.com", mk: 1 })).toBe(false);
  });

  it("does not opt in without an email", () => {
    expect(bookingMetaOptsIn({ uid: null, em: "", mk: 1 })).toBe(false);
  });

  it("handles null metadata", () => {
    expect(bookingMetaOptsIn(null)).toBe(false);
  });
});
