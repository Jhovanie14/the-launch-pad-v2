export interface Receipt {
  kind: "card" | "cash" | "membership";
  title: "Payment received, you're booked" | "You're booked";
  /** "Sat, Nov 21": the appointment's calendar date, read in UTC. */
  day: string | null;
  /** "10:30 AM" */
  time: string | null;
  durationMin: number | null;
  serviceName: string;
  /** The membership covered the service. */
  serviceFree: boolean;
  /** List price of the service. */
  servicePrice: number;
  extras: { name: string; price: number }[];
  /** Holiday sale first, then any promo, so the lines add up to the total. */
  discounts: { label: string; amount: number }[];
  /** What was charged (card: Stripe's amount_total; otherwise the booking's total_price). */
  total: number;
  plate: string | null;
  vehicle: string | null;
  reference: string;
  paidWith: string;
}

/** Same rounding as booking (computeBookingAmount): toFixed(2). */
const round2 = (n: number) => Number(n.toFixed(2));

/** "Sat, Nov 21" for a "YYYY-MM-DD" calendar date (read in UTC), or null. */
export function formatDay(date: string | null): string | null {
  const day = String(date ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
}

/** "10:30 AM" for "10:30", or null. */
export function formatTime(time: string | null): string | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time ?? ""));
  if (!m) return null;
  const hours = Number(m[1]);
  return `${hours % 12 || 12}:${m[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

/**
 * Everything a "you're booked" page shows. Lines show list prices; the
 * holiday sale is rebuilt the way booking applies it (the service on its own,
 * the extras together, each rounded), and anything else between that and the
 * charge is a promo "Discount" row. The total is always what was charged.
 */
export function buildReceipt(input: {
  paymentMethod: "card" | "cash" | "subscription" | null;
  serviceName: string | null;
  /** service_packages.price */
  serviceListPrice: number;
  /** bookings.service_package_price: sale applied, 0 when a membership covered it. */
  serviceChargedPrice: number | null;
  extras: { name: string; price: number }[];
  totalPaid: number;
  date: string | null;
  time: string | null;
  durationMin: number | null;
  plate: string | null;
  vehicle: string | null;
  bookingId: string | null;
  paymentIntentId: string | null;
  saleActive: boolean;
  saleDiscount: number;
}): Receipt {
  const kind: Receipt["kind"] =
    input.paymentMethod === "subscription" ? "membership" : input.paymentMethod === "cash" ? "cash" : "card";
  const serviceFree =
    kind === "membership" || (input.serviceChargedPrice !== null && Number(input.serviceChargedPrice) === 0);
  const servicePrice = Number(input.serviceListPrice) || 0;
  const extras = input.extras.map((e) => ({ name: e.name, price: Number(e.price) || 0 }));
  const total = round2(Number(input.totalPaid) || 0);

  const extrasTotal = extras.reduce((sum, e) => sum + e.price, 0);
  const listTotal = round2((serviceFree ? 0 : servicePrice) + extrasTotal);
  const onSale = (n: number) => round2(n * (1 - input.saleDiscount));
  const saleTotal = input.saleActive
    ? round2((serviceFree ? 0 : onSale(servicePrice)) + onSale(extrasTotal))
    : listTotal;
  const discounts: Receipt["discounts"] = [];
  const saleAmount = round2(listTotal - saleTotal);
  if (saleAmount >= 0.01) {
    discounts.push({ label: `Holiday sale (${Math.round(input.saleDiscount * 100)}% off)`, amount: saleAmount });
  }
  const promoAmount = round2(saleTotal - total);
  if (promoAmount >= 0.01) discounts.push({ label: "Discount", amount: promoAmount });

  const duration = Number(input.durationMin);
  return {
    kind,
    title: kind === "card" ? "Payment received, you're booked" : "You're booked",
    day: formatDay(input.date),
    time: formatTime(input.time),
    durationMin: Number.isFinite(duration) && duration > 0 ? duration : null,
    serviceName: input.serviceName?.trim() || "Your service",
    serviceFree,
    servicePrice,
    extras,
    discounts,
    total,
    plate: input.plate?.trim() || null,
    vehicle: input.vehicle?.trim() || null,
    reference: input.bookingId ? `Booking ${input.bookingId}` : `Payment ${input.paymentIntentId ?? ""}`.trim(),
    paidWith:
      kind === "membership" ? "Free with your membership" : kind === "cash" ? "Pay cash at your visit" : "Paid by card",
  };
}

/** The page's one flame button: the next step depends on whether the customer has an account. */
export function successActionFor(signedIn: boolean): { href: string; label: string } {
  return signedIn
    ? { href: "/dashboard/bookings", label: "See your bookings" }
    : { href: "/signup", label: "Create a free account" };
}
