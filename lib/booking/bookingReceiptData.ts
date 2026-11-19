import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import { waitForPaidBooking } from "@/lib/booking/waitForPaidBooking";
import { HOLIDAY_SALE_ACTIVE, HOLIDAY_SALE_DISCOUNT } from "@/lib/booking/holidaySale";
import { buildReceipt, type Receipt } from "./bookingReceipt";

const BOOKING_COLUMNS =
  "id, service_package_id, service_package_name, service_package_price, appointment_date, appointment_time, total_duration, total_price, payment_method, vehicle_id";

interface BookingRow {
  id: string;
  service_package_id: string | null;
  service_package_name: string | null;
  service_package_price: number | null;
  appointment_date: string;
  appointment_time: string;
  total_duration: number;
  total_price: number;
  payment_method: string | null;
  vehicle_id: string | null;
}

async function vehicleFor(db: SupabaseClient, vehicleId: string | null | undefined) {
  if (!vehicleId) return { plate: null, vehicle: null };
  const { data } = await db
    .from("vehicles")
    .select("license_plate, year, make, model")
    .eq("id", vehicleId)
    .maybeSingle();
  if (!data) return { plate: null, vehicle: null };
  const vehicle = [data.year, data.make, data.model].filter(Boolean).join(" ") || null;
  return { plate: (data.license_plate as string | null) ?? null, vehicle };
}

async function addOnsForBooking(db: SupabaseClient, bookingId: string) {
  const { data, error } = await db.from("booking_add_ons").select("add_ons(name, price)").eq("booking_id", bookingId);
  if (error || !data) return [];
  return data
    .map((row: { add_ons: unknown }) => row.add_ons as { name: string; price: number } | null)
    .filter((a): a is { name: string; price: number } => !!a)
    .map((a) => ({ name: a.name, price: Number(a.price) }));
}

async function addOnsByIds(db: SupabaseClient, ids: string[]) {
  if (ids.length === 0) return [];
  const { data } = await db.from("add_ons").select("name, price").in("id", ids);
  return (data ?? []).map((a: { name: string; price: number }) => ({ name: a.name, price: Number(a.price) }));
}

/** The service’s list price (bookings store the charged price: sale applied, 0 when free). */
async function listPrice(db: SupabaseClient, serviceId: string | null | undefined, fallback: number) {
  if (!serviceId) return fallback;
  const { data } = await db.from("service_packages").select("price").eq("id", serviceId).maybeSingle();
  return data ? Number(data.price) : fallback;
}

async function readBooking(db: SupabaseClient, id: string): Promise<BookingRow | null> {
  const { data } = await db.from("bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle();
  return (data as BookingRow | null) ?? null;
}

const sale = { saleActive: HOLIDAY_SALE_ACTIVE, saleDiscount: HOLIDAY_SALE_DISCOUNT };

/**
 * Server only. The receipt for either "you're booked" page, from a Stripe
 * Checkout session (card) or a booking id (cash or membership). The webhook
 * saves card bookings, and Stripe's redirect can arrive first, so a paid
 * session with no booking yet is shown from the session's own details.
 */
export async function loadBookingReceipt(params: { session_id?: string; booking_id?: string }): Promise<Receipt> {
  const db = createAdminClient();

  if (params.session_id) {
    const session = await stripe.checkout.sessions.retrieve(params.session_id, { expand: ["payment_intent"] });
    const meta = session.metadata?.booking ? JSON.parse(session.metadata.booking) : null;
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;

    const found = await waitForPaidBooking(db, paymentIntentId);
    if (!found && session.payment_status !== "paid") {
      console.error("No paid booking for payment intent:", paymentIntentId);
      throw new Error("Booking not found");
    }
    const booking = found ? await readBooking(db, found.id) : null;
    const totalPaid = (session.amount_total ?? 0) / 100;

    if (booking) {
      const charged = booking.service_package_price;
      const [extras, car, list] = await Promise.all([
        addOnsForBooking(db, booking.id),
        vehicleFor(db, booking.vehicle_id),
        listPrice(db, booking.service_package_id, Number(charged ?? 0)),
      ]);
      return buildReceipt({
        paymentMethod: "card",
        serviceName: booking.service_package_name,
        serviceListPrice: list,
        serviceChargedPrice: charged === null || charged === undefined ? 0 : Number(charged),
        extras,
        totalPaid,
        date: booking.appointment_date,
        time: booking.appointment_time,
        durationMin: booking.total_duration,
        ...car,
        bookingId: booking.id,
        paymentIntentId,
        ...sale,
      });
    }

    const ids = String(meta?.aids ?? "").split(",").filter(Boolean);
    const metaCharged = Number(meta?.spp ?? 0);
    const [extras, car, list] = await Promise.all([
      addOnsByIds(db, ids),
      vehicleFor(db, meta?.vid ?? null),
      listPrice(db, meta?.spid ?? null, metaCharged),
    ]);
    return buildReceipt({
      paymentMethod: "card",
      serviceName: meta?.spn ?? null,
      serviceListPrice: list,
      serviceChargedPrice: metaCharged,
      extras,
      totalPaid,
      date: meta?.ad ?? null,
      time: meta?.at ?? null,
      durationMin: meta?.td != null ? Number(meta.td) : null,
      ...car,
      bookingId: null,
      paymentIntentId,
      ...sale,
    });
  }

  if (params.booking_id) {
    const booking = await readBooking(db, params.booking_id);
    if (!booking) throw new Error("Booking not found");
    const charged = booking.service_package_price;
    const [extras, car, list] = await Promise.all([
      addOnsForBooking(db, booking.id),
      vehicleFor(db, booking.vehicle_id),
      listPrice(db, booking.service_package_id, Number(charged ?? 0)),
    ]);
    const method = booking.payment_method;
    return buildReceipt({
      paymentMethod: method === "cash" ? "cash" : method === "card" ? "card" : "subscription",
      serviceName: booking.service_package_name,
      serviceListPrice: list,
      serviceChargedPrice: charged === null || charged === undefined ? null : Number(charged),
      extras,
      totalPaid: Number(booking.total_price ?? 0),
      date: booking.appointment_date,
      time: booking.appointment_time,
      durationMin: booking.total_duration,
      ...car,
      bookingId: booking.id,
      paymentIntentId: null,
      ...sale,
    });
  }

  throw new Error("No session_id or booking_id provided");
}
