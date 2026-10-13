/**
 * What every blog mutation invalidates.
 *
 * The public pages live in the `(user)` route group, and Next derives their
 * implicit cache tags from the file path INCLUDING the group
 * (`_N_T_/(user)/blog/layout`). So the layout must be named as
 * "/(user)/blog" — a bare "/blog" layout path matches no page and silently
 * does nothing. Invalidating the layout covers /blog, every post, every
 * category page, the preview and the RSS feed.
 */
export const BLOG_REVALIDATION_TARGETS: { path: string; type?: "layout" | "page" }[] = [
  { path: "/(user)/blog", type: "layout" },
  { path: "/admin/blog", type: "layout" },
  { path: "/sitemap.xml" },
];
