/** Pages only for signed-out visitors: a signed-in visitor is sent to their dashboard. */
export const SIGNED_OUT_ONLY_ROUTES = ["/login", "/signup"];

/**
 * Where a signed-in visitor on a public page is sent, or null to let them
 * stay. Signed-in customers (and admins) can browse the public site (home,
 * About, FAQ, Blog, Contact, ...); only login and signup redirect.
 */
export function signedInRedirect(pathname: string, role: string): string | null {
  if (!SIGNED_OUT_ONLY_ROUTES.includes(pathname)) return null;
  return role === "admin" ? "/admin/dashboard" : "/dashboard";
}
