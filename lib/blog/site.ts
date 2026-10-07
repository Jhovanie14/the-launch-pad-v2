/**
 * The canonical public origin. The same value app/sitemap.ts and robots.ts
 * hard-code; blog code imports it so canonicals, JSON-LD and "is this link
 * internal?" all agree.
 */
export const SITE_URL = "https://www.thelaunchpadwash.com";
export const SITE_HOST = new URL(SITE_URL).hostname;
