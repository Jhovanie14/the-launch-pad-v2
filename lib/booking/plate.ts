/**
 * License plate checks for the booking pop-up. US plates are up to 8 letters
 * and numbers; people often type a space or dash between groups.
 */

export function normalizePlate(raw: string | undefined | null): string {
  return (raw ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

/** Message to show, or null when the plate is usable. */
export function plateError(raw: string | undefined | null): string | null {
  const plate = normalizePlate(raw);
  if (!/[A-Z0-9]/.test(plate)) return "Enter your license plate.";
  if (!/^[A-Z0-9 -]+$/.test(plate)) return "Use letters and numbers only.";
  if (plate.replace(/[ -]/g, "").length > 8) return "A plate has at most 8 letters and numbers.";
  return null;
}
