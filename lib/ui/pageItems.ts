export type PageItem = number | "gap";

/**
 * Page buttons to render: every page when there are few, otherwise the first,
 * the last, and the current page's neighbours, with "gap" where pages are
 * skipped. Never more than 7 items, so the control stays a fixed width no
 * matter how many pages there are.
 */
export function getPageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const current = Math.min(Math.max(page, 1), totalPages);
  if (current <= 4) return [1, 2, 3, 4, 5, "gap", totalPages];
  if (current >= totalPages - 3) {
    return [1, "gap", ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)];
  }
  return [1, "gap", current - 1, current, current + 1, "gap", totalPages];
}
