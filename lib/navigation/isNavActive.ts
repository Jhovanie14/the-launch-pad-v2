/** Roots that only match themselves: their sections have their own links. */
const EXACT = new Set(["/", "/dashboard"]);

/** Is this nav link the current page (or a page inside its section)? */
export function isNavActive(pathname: string, href: string): boolean {
  if (EXACT.has(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The full-screen loader while signing out. The public bar stays mounted when
 * sign-out lands on another public page, so the loader must end once the user
 * is gone (and a failed sign-out resets the flag), or it covers the site.
 */
export function showSignOutLoader(signingOut: boolean, signedIn: boolean): boolean {
  return signingOut && signedIn;
}
