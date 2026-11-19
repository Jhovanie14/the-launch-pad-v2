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
  discount: { label: string; amount: number } | null;
  /** What was charged (card: Stripe's amount_total; otherwise the booking's total_price). */
  total: number;
  plate: string | null;
  vehicle: string | null;
  reference: string;
  paidWith: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

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
 * Everything a "you're booked" page shows. The total is always what was
 * charged, never the list subtotal; any gap shows as a discount row so the
 * lines add up.
 */
export function buildReceipt(input: {
  paymentMethod: "card" | "cash" | "subscription" | null;
  serviceName: string | null;
  servicePrice: number;
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
  const serviceFree = kind === "membership";
  const servicePrice = Number(input.servicePrice) || 0;
  const extras = input.extras.map((e) => ({ name: e.name, price: Number(e.price) || 0 }));
  const total = round2(Number(input.totalPaid) || 0);

  const listTotal = round2((serviceFree ? 0 : servicePrice) + extras.reduce((s, e) => s + e.price, 0));
  const gap = round2(listTotal - total);
  let discount: Receipt["discount"] = null;
  if (gap >= 0.01) {
    const sale = input.saleActive && Number((listTotal * (1 - input.saleDiscount)).toFixed(2)) === total;
    discount = {
      label: sale ? `Holiday sale (${Math.round(input.saleDiscount * 100)}% off)` : "Discount",
      amount: gap,
    };
  }

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
    discount,
    total,
    plate: input.plate?.trim() || null,
    vehicle: input.vehicle?.trim() || null,
    reference: input.bookingId ? `Booking ${input.bookingId}` : `Payment ${input.paymentIntentId ?? ""}`.trim(),
    paidWith:
      kind === "membership" ? "Free with your membership" : kind === "cash" ? "Pay cash at your visit" : "Paid by card",
  };
}
