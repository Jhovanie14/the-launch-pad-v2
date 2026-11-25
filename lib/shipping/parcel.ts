// Turning a cart into one Shippo parcel: add up the packed weights and pick the
// smallest pouch that holds them. One order is never split into several
// parcels (spec: "Parcel").

export interface Pouch {
  name: string;
  length_in: number;
  width_in: number;
  height_in: number;
  max_weight_oz: number;
}

export const DEFAULT_POUCH: Pouch = { name: "Standard pouch", length_in: 13, width_in: 10, height_in: 1, max_weight_oz: 160 };

export interface ShippoParcel {
  length: string;
  width: string;
  height: string;
  distance_unit: "in";
  weight: string;
  mass_unit: "oz";
}

export type ParcelResult = { ok: true; parcel: ShippoParcel; weightOz: number } | { ok: false; error: string };

export const TOO_BIG = "This order is too big to ship online. Choose pickup or contact us.";
export const noWeight = (name: string) => `Shipping isn't available for ${name} yet. Choose pickup.`;

const volume = (p: Pouch) => p.length_in * p.width_in * p.height_in;

export function buildParcel(
  lines: { name: string; weight_oz: number | null; quantity: number }[],
  pouches: Pouch[],
): ParcelResult {
  const missing = lines.find((l) => l.weight_oz == null || !(l.weight_oz > 0));
  if (missing) return { ok: false, error: noWeight(missing.name) };

  const raw = lines.reduce((sum, l) => sum + (l.weight_oz as number) * l.quantity, 0);
  // Round up to a tenth of an ounce; the epsilon keeps 6.99 + float noise at 7.
  const weightOz = Math.ceil(raw * 10 - 1e-9) / 10;

  const fits = (pouches.length ? pouches : [DEFAULT_POUCH])
    .filter((p) => p.max_weight_oz >= weightOz)
    .sort((a, b) => volume(a) - volume(b));
  const pouch = fits[0];
  if (!pouch) return { ok: false, error: TOO_BIG };

  return {
    ok: true,
    weightOz,
    parcel: {
      length: String(pouch.length_in),
      width: String(pouch.width_in),
      height: String(pouch.height_in),
      distance_unit: "in",
      weight: String(weightOz),
      mass_unit: "oz",
    },
  };
}
