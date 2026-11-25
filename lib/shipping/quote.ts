import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";
import type { CartItem } from "@/lib/products/cart";
import { SHIP_FROM } from "./origin";
import { buildParcel } from "./parcel";
import { getShippingSettings } from "./settings";
import type { ShippoFetch } from "./shippo";
import { isShippableState } from "./states";

/** A US shipping address as the cart collects it. */
export interface ShipAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export interface ShippingQuote {
  amount: number;
  service: string;
  rateId: string;
  days: number | null;
  /** The address as USPS normalised it; this is what gets shipped to. */
  address: ShipAddress;
}

interface ShippoRate {
  object_id: string;
  provider: string;
  amount: string;
  estimated_days?: number | null;
  servicelevel?: { token?: string; name?: string };
}

export const UNAVAILABLE = "Shipping is not available right now";
export const CANT_SHIP_HERE = "We can't ship to this address yet. Choose pickup or contact us.";
export const UNCONFIRMED = "We couldn't confirm this address";
const INCOMPLETE = "Enter the full address, including a 5-digit ZIP";

const ZIP = /^\d{5}(-\d{4})?$/;

/** USPS Ground Advantage when offered, otherwise the cheapest USPS rate. */
export function pickUspsRate(rates: ShippoRate[]): ShippoRate | null {
  const usps = (rates ?? []).filter((r) => r.provider === "USPS");
  const ga = usps.find((r) => r.servicelevel?.token === "usps_ground_advantage");
  if (ga) return ga;
  return usps.sort((a, b) => Number(a.amount) - Number(b.amount))[0] ?? null;
}

function cleanAddress(a: ShipAddress): ShipAddress {
  const t = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    name: t(a?.name),
    street1: t(a?.street1),
    street2: t(a?.street2),
    city: t(a?.city),
    state: t(a?.state).toUpperCase(),
    zip: t(a?.zip),
    phone: t(a?.phone),
  };
}

function serviceName(rate: ShippoRate): string {
  return rate.servicelevel?.token === "usps_ground_advantage"
    ? "USPS Ground Advantage"
    : `USPS ${rate.servicelevel?.name ?? "shipping"}`;
}

/**
 * The one shipping price: used by the cart's quote route and re-run by
 * placeOrder, so the browser's number is never trusted. Cheap checks (address
 * shape, state, weights, pouch) run before any Shippo call.
 */
export async function quoteShipping(
  deps: { shippo: ShippoFetch; db: SupabaseClient },
  cart: CartItem[],
  input: ShipAddress,
): Promise<ShippingQuote> {
  if (!Array.isArray(cart) || cart.length === 0) throw new ApiError("Your cart is empty", 400);
  const address = cleanAddress(input);
  if (!address.name || !address.street1 || !address.city || !address.state || !address.phone || !ZIP.test(address.zip)) {
    throw new ApiError(INCOMPLETE, 400);
  }

  const settings = await getShippingSettings(deps.db);
  if (!isShippableState(address.state, settings.excludedStates)) throw new ApiError(CANT_SHIP_HERE, 400);

  const { data: products, error } = await deps.db
    .from("products")
    .select("id, name, weight_oz")
    .in("id", cart.map((i) => i.productId));
  if (error) throw new ApiError("Could not load products", 500);
  const lines = cart.map((item) => {
    const p = (products ?? []).find((x: { id: string }) => x.id === item.productId);
    if (!p) throw new ApiError("A product in your cart is no longer available", 400);
    return { name: p.name as string, weight_oz: p.weight_oz as number | null, quantity: item.quantity };
  });
  const parcel = buildParcel(lines, settings.pouches);
  if (!parcel.ok) throw new ApiError(parcel.error, 400);

  const to = {
    name: address.name,
    street1: address.street1,
    street2: address.street2 || undefined,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: "US",
    phone: address.phone,
  };

  let validated: any;
  try {
    validated = await deps.shippo("POST", "/addresses/", { ...to, validate: true });
  } catch {
    throw new ApiError(UNAVAILABLE, 503);
  }
  const results = validated?.validation_results;
  if (!results?.is_valid) {
    const messages: string[] = (results?.messages ?? []).map((m: { text?: string }) => m.text).filter(Boolean);
    throw new ApiError(UNCONFIRMED, 400, { messages, suggestion: null });
  }
  const normalised: ShipAddress = {
    ...address,
    street1: validated.street1 || address.street1,
    street2: validated.street2 || address.street2,
    city: validated.city || address.city,
    state: (validated.state || address.state).toUpperCase(),
    zip: validated.zip || address.zip,
  };

  let shipment: any;
  try {
    shipment = await deps.shippo("POST", "/shipments/", {
      address_from: SHIP_FROM,
      address_to: { ...to, ...normalised, street2: normalised.street2 || undefined, country: "US" },
      parcels: [parcel.parcel],
      async: false,
    });
  } catch {
    throw new ApiError(UNAVAILABLE, 503);
  }
  const rate = pickUspsRate(shipment?.rates ?? []);
  if (!rate) throw new ApiError(UNAVAILABLE, 503);

  return {
    amount: Math.round(Number(rate.amount) * 100) / 100,
    service: serviceName(rate),
    rateId: rate.object_id,
    days: rate.estimated_days ?? null,
    address: normalised,
  };
}
