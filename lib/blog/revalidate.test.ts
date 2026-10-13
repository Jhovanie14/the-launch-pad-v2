import { describe, expect, it } from "vitest";
import { BLOG_REVALIDATION_TARGETS } from "@/lib/blog/revalidate";

describe("BLOG_REVALIDATION_TARGETS", () => {
  it("names the public blog layout with its route group, or it invalidates nothing", () => {
    // Implicit cache tags carry the group: _N_T_/(user)/blog/layout. A bare
    // "/blog" layout path matches no page and silently does nothing.
    expect(BLOG_REVALIDATION_TARGETS).toContainEqual({ path: "/(user)/blog", type: "layout" });
    expect(BLOG_REVALIDATION_TARGETS).not.toContainEqual({ path: "/blog", type: "layout" });
  });

  it("also refreshes the admin list and the sitemap", () => {
    expect(BLOG_REVALIDATION_TARGETS).toContainEqual({ path: "/admin/blog", type: "layout" });
    expect(BLOG_REVALIDATION_TARGETS).toContainEqual({ path: "/sitemap.xml" });
  });
});
