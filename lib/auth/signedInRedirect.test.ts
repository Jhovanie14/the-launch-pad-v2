import { describe, expect, it } from "vitest";
import { signedInRedirect } from "./signedInRedirect";

describe("signedInRedirect", () => {
  it("signed-in customers can browse the public pages", () => {
    for (const path of ["/", "/about", "/blog", "/contact", "/faq", "/services", "/pricing"]) {
      expect(signedInRedirect(path, "user")).toBeNull();
    }
  });

  it("login and signup send a signed-in customer to the dashboard", () => {
    expect(signedInRedirect("/login", "user")).toBe("/dashboard");
    expect(signedInRedirect("/signup", "user")).toBe("/dashboard");
  });

  it("login and signup send an admin to the admin dashboard", () => {
    expect(signedInRedirect("/login", "admin")).toBe("/admin/dashboard");
    expect(signedInRedirect("/signup", "admin")).toBe("/admin/dashboard");
  });

  it("admins can browse the public pages too", () => {
    expect(signedInRedirect("/", "admin")).toBeNull();
    expect(signedInRedirect("/faq", "admin")).toBeNull();
  });
});
