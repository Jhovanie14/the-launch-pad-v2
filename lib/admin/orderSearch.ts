/**
 * Does a store order match the counter's search box? Matches the reference
 * (a prefix, any case), phone digits (punctuation ignored, 3 digits or more)
 * or the customer's name or email.
 */
export function matchesOrderSearch(
  order: { ref: string; phone: string | null },
  profile: { full_name: string | null; email: string | null } | null,
  q: string,
): boolean {
  const query = q.trim().toLowerCase();
  if (!query) return true;

  if (order.ref.toLowerCase().startsWith(query)) return true;

  const digits = query.replace(/\D/g, "");
  if (digits.length >= 3 && digits.length === query.replace(/[\s()+.-]/g, "").length) {
    if ((order.phone ?? "").replace(/\D/g, "").includes(digits)) return true;
  }

  const name = profile?.full_name?.toLowerCase() ?? "";
  const email = profile?.email?.toLowerCase() ?? "";
  return name.includes(query) || email.includes(query);
}
