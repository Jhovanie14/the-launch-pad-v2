/** Roots that only match themselves: their sections have their own links. */
const EXACT = new Set(["/", "/dashboard"]);

/** Is this nav link the current page (or a page inside its section)? */
export function isNavActive(pathname: string, href: string): boolean {
  if (EXACT.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
