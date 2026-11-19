import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subscription } from "@/types";
import type { AddOnRow, ServicePackageRow } from "@/types/db";
import { bookingSelectionKey, type BookingSelection, type BookingStep } from "./bookingParams";
import type { VehicleDisplay } from "./vehicleDisplay";
import type { WelcomeOffer } from "./welcomeOffer";

export interface BookingUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

/** What a booking step page loads on the server and hands to the browser. */
export interface BookingInitialData {
  /** bookingSelectionKey of what was loaded; null = the server could not load the selection, the browser loads it. */
  selectionKey: string | null;
  user: BookingUser | null;
  /** undefined = the server could not load it; the browser loads it as before. */
  subscription: Subscription | null | undefined;
  /** Service step only, otherwise null. */
  catalog: { services: ServicePackageRow[]; addOns: AddOnRow[] } | null;
  service: ServicePackageRow | null;
  addOns: AddOnRow[];
  /** Confirmation step only, otherwise null. */
  vehicleInfo: VehicleDisplay | null;
  /** The promo the guest account pop-up may advertise. Service step, guests only; otherwise null. */
  welcomeOffer: WelcomeOffer | null;
}

/**
 * Everything a booking step shows, loaded at once. The same queries the
 * browser used to run after the page opened (useBookingFlow). Anything that
 * fails is left for the browser to load, never filled in with a guess: a
 * member must not be shown a payment screen because their membership lookup
 * failed.
 */
export async function loadBookingStep(args: {
  step: BookingStep;
  selection: BookingSelection;
  /** The request's own client: RLS applies. */
  db: SupabaseClient;
  /** null = signed out; undefined = the sign-in check failed, so who it is is unknown. */
  user: BookingUser | null | undefined;
  getSubscription: (userId: string) => Promise<Subscription | null>;
  getVehicle: (
    userId: string | null,
    sel: { licensePlate: string; vehicleId: string }
  ) => Promise<VehicleDisplay | null>;
  getWelcomeOffer: () => Promise<WelcomeOffer | null>;
}): Promise<BookingInitialData> {
  const { step, selection, db, user } = args;
  const { serviceId, addOnIds, licensePlate, vehicleId } = selection;
  // Sign-in check failed: a member must not be treated as a guest. Leave
  // sign-in, membership and the selection (which includes their car) to the
  // browser, as before this page loaded on the server.
  const userUnknown = user === undefined;

  const [catalog, chosen, subscription, vehicleInfo, welcomeOffer] = await Promise.all([
    step === "service" ? loadCatalog(db) : Promise.resolve(null),
    userUnknown ? Promise.resolve(null) : loadSelection(db, serviceId, addOnIds),
    userUnknown
      ? Promise.resolve(undefined)
      : user
      ? args.getSubscription(user.id).catch((err) => {
          console.error("Booking: membership lookup failed", err);
          return undefined;
        })
      : Promise.resolve(null),
    step === "confirmation" && !userUnknown && (licensePlate || vehicleId)
      ? args.getVehicle(user?.id ?? null, { licensePlate, vehicleId }).catch((err) => {
          console.error("Booking: car lookup failed", err);
          return null;
        })
      : Promise.resolve(null),
    // Only a real guest sees the account pop-up.
    step === "service" && user === null
      ? args.getWelcomeOffer().catch((err) => {
          console.error("Booking: welcome offer lookup failed", err);
          return null;
        })
      : Promise.resolve(null),
  ]);

  return {
    selectionKey: chosen ? bookingSelectionKey(selection) : null,
    user: user ?? null,
    subscription,
    catalog,
    service: chosen?.service ?? null,
    addOns: chosen?.addOns ?? [],
    vehicleInfo,
    welcomeOffer,
  };
}

async function loadCatalog(db: SupabaseClient): Promise<BookingInitialData["catalog"]> {
  const [services, addOns] = await Promise.all([
    db.from("service_packages").select("*").eq("is_active", true).order("created_at", { ascending: true }),
    db.from("add_ons").select("*").eq("is_active", true).order("created_at", { ascending: true }),
  ]);
  if (services.error || addOns.error) {
    console.error("Booking: catalog lookup failed", services.error ?? addOns.error);
    return null;
  }
  return {
    services: (services.data ?? []) as ServicePackageRow[],
    addOns: (addOns.data ?? []) as AddOnRow[],
  };
}

/** The chosen service and add-ons, or null if a lookup failed. */
async function loadSelection(
  db: SupabaseClient,
  serviceId: string | null,
  addOnIds: string[]
): Promise<{ service: ServicePackageRow | null; addOns: AddOnRow[] } | null> {
  const [service, addOns] = await Promise.all([
    serviceId
      ? db.from("service_packages").select("*").eq("id", serviceId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    addOnIds.length > 0
      ? db.from("add_ons").select("*").in("id", addOnIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (service.error || addOns.error) {
    console.error("Booking: selection lookup failed", service.error ?? addOns.error);
    return null;
  }
  return {
    service: (service.data as ServicePackageRow | null) ?? null,
    addOns: (addOns.data ?? []) as AddOnRow[],
  };
}
