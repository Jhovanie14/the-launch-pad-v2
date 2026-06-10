const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[&<>"']/g, (ch) => MAP[ch]);
}

/** Only allow https banner images hosted on our Supabase storage domain. */
export function isAllowedBannerUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
