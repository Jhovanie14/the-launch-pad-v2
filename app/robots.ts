import type { MetadataRoute } from "next";

const BASE_URL = "https://www.thelaunchpadwash.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in surfaces and endpoints: nothing here is a useful landing
      // page, and /admin already redirects anonymous traffic away.
      disallow: ["/admin", "/dashboard", "/api", "/auth"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
