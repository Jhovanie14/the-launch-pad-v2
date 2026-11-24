import { describe, expect, it } from "vitest";
import { matchesOrderSearch } from "./orderSearch";

const order = { ref: "1A2B3C4D", phone: "+1 (713) 555-0142" };
const dee = { full_name: "Dee Martinez", email: "dee@example.com" };

describe("matchesOrderSearch", () => {
  it("matches a reference prefix, any case", () => {
    expect(matchesOrderSearch(order, dee, "1a2b")).toBe(true);
    expect(matchesOrderSearch(order, dee, " 1A2B3C4D ")).toBe(true);
    expect(matchesOrderSearch(order, dee, "2B3C")).toBe(false);
  });
  it("matches phone digits, ignoring punctuation, from 3 digits", () => {
    expect(matchesOrderSearch(order, dee, "555-0142")).toBe(true);
    expect(matchesOrderSearch(order, dee, "7135550142")).toBe(true);
    expect(matchesOrderSearch(order, dee, "14")).toBe(false);
  });
  it("matches the name or email", () => {
    expect(matchesOrderSearch(order, dee, "martinez")).toBe(true);
    expect(matchesOrderSearch(order, dee, "dee@exa")).toBe(true);
    expect(matchesOrderSearch(order, null, "martinez")).toBe(false);
  });
  it("an empty search matches everything", () => {
    expect(matchesOrderSearch(order, null, "  ")).toBe(true);
  });
  it("a missing phone never matches digits", () => {
    expect(matchesOrderSearch({ ref: "9F7E21C0", phone: null }, null, "555")).toBe(false);
  });
});
