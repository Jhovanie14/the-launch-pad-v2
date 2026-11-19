import { describe, expect, it } from "vitest";
import { isNavActive, showSignOutLoader } from "./isNavActive";

describe("isNavActive", () => {
  it('"/" only matches itself', () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/services", "/")).toBe(false);
  });

  it("/services matches /services and /services/x, not /servicesx", () => {
    expect(isNavActive("/services", "/services")).toBe(true);
    expect(isNavActive("/services/x", "/services")).toBe(true);
    expect(isNavActive("/servicesx", "/services")).toBe(false);
  });

  it("/dashboard is exact", () => {
    expect(isNavActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavActive("/dashboard/bookings", "/dashboard")).toBe(false);
  });

  it("/blog matches a post", () => {
    expect(isNavActive("/blog/some-post", "/blog")).toBe(true);
  });
});

describe("showSignOutLoader", () => {
  it("shows only while signing out and still signed in", () => {
    expect(showSignOutLoader(true, true)).toBe(true);
    expect(showSignOutLoader(true, false)).toBe(false);
    expect(showSignOutLoader(false, true)).toBe(false);
  });
});
