import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  MapPin,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/utils/supabase/admin";
import { OrderData } from "@/types";

// Kept here: a server page can't read a value exported from a client module.
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";

interface SuccessPageProps {
  searchParams: { session_id?: string; booking_id?: string };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const supabase = createAdminClient();

  let orderData: OrderData | null = null;
  let addOns: { id: string; name: string; price: number }[] = [];

  // 🔹 Case 1: Stripe Checkout (cash/card or add-ons)
  if (params.session_id) {
    const session = await stripe.checkout.sessions.retrieve(params.session_id, {
      expand: ["line_items", "payment_intent"],
    });

    const bookingMeta = session.metadata?.booking
      ? JSON.parse(session.metadata.booking)
      : null;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    // console.log("Booking Meta:", bookingMeta);
    // console.log("Payment Intent ID:", paymentIntentId);

    // 🟩 Fetch booking from Supabase using payment_intent_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id")
      .eq("payment_intent_id", paymentIntentId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found for payment intent:", paymentIntentId);
      throw new Error("Booking not found");
    }

    console.log("Booking ID from DB:", booking.id);

    // 🟩 Build items array from metadata
    const items = [
      {
        name: bookingMeta?.spn ?? "Service Package",
        price: Number(bookingMeta?.spp ?? 0),
        quantity: 1,
      },
    ];

    // 🟩 Fetch add-ons linked to the booking using the DB booking ID
    const { data: addOnsData, error: addOnsError } = await supabase
      .from("booking_add_ons")
      .select("add_ons(id, name, price)")
      .eq("booking_id", booking.id);

    // ✅ Assign to the outer addOns variable (not redeclare)
    if (!addOnsError && addOnsData?.length) {
      addOns = addOnsData.map((row: any) => row.add_ons);
      console.log("Add-ons found:", addOns);
    }

    // 🟩 Compute totals
    const subtotal =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
      addOns.reduce((sum, a) => sum + a.price, 0);

    const tax = (session.total_details?.amount_tax ?? 0) / 100;
    const total = (session.amount_total ?? 0) / 100;

    // 🟩 Determine payment method
    const paymentIntent = session.payment_intent as any;
    const paymentType =
      paymentIntent?.payment_method_types?.[0]?.toUpperCase() ?? "CARD";

    orderData = {
      type: "checkout",
      date: bookingMeta?.ad
        ? formatCalendarDate(bookingMeta.ad)
        : new Date(session.created * 1000).toLocaleDateString(),
      orderNumber: paymentIntentId ?? session.id,
      paymentMethod: paymentType === "CASH" ? "Cash" : "Card",
      items,
      subtotal,
      tax,
      total,
    };
  }

  // 🔹 Case 2: Subscription-only or cash booking
  else if (params.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, service_package_name, service_package_price, appointment_date, payment_method, total_price"
      )
      .eq("id", params.booking_id)
      .single();

    if (!booking) throw new Error("Booking not found");

    // 🔸 Fetch add-ons (if any)
    const { data: addOnsData, error } = await supabase
      .from("booking_add_ons")
      .select(`add_ons(id, name, price)`)
      .eq("booking_id", booking.id);

    if (!error && addOnsData) {
      addOns = addOnsData.map((row: any) => row.add_ons);
    }

    // 🔸 Determine if this is a pure subscription or add-on payment
    const hasAddOns = addOns.length > 0;
    const paymentMethod = hasAddOns
      ? booking.payment_method === "cash"
        ? "Cash"
        : "Card"
      : "Subscription";
    // 🔸 Only show add-ons if user actually paid for them
    const items = [
      {
        name: booking.service_package_name ?? "Service Package",
        price: booking.service_package_price ?? 0,
        quantity: 1,
      },
    ];

    const subtotal =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
      (hasAddOns ? addOns.reduce((sum, a) => sum + a.price, 0) : 0);

    const discountedTotal = booking.total_price ?? subtotal;
    const discountAmount = subtotal - discountedTotal;
    const discountPercent =
      discountAmount > 0 ? Math.round((discountAmount / subtotal) * 100) : 0;

    orderData = {
      type: hasAddOns ? "checkout" : "subscription",
      date: formatCalendarDate(booking.appointment_date),
      orderNumber: booking.id,
      paymentMethod,
      items,
      subtotal,
      tax: 0,
      total: booking.total_price ?? subtotal,
      discountAmount,
      discountPercent,
    };
  }

  if (!orderData) throw new Error("No session_id or booking_id provided");

  const isCard = orderData.paymentMethod === "Card";
  const discount = orderData.discountAmount ?? 0;
  const addOnsPaid = orderData.type === "checkout" && addOns.length > 0;

  return (
    <div className="max-w-2xl">
      <CheckCircle2 aria-hidden className="size-10 text-ink" />
      <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">
        {isCard ? "Payment received, you're booked" : "You're booked"}
      </h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        We&apos;ve emailed your confirmation. See you at 10410 S Main St.
      </p>

      <section
        aria-labelledby="receipt-heading"
        className="mt-6 rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
      >
        <h2 id="receipt-heading" className="text-xl font-black tracking-tight text-ink">
          Booking details
        </h2>

        <dl className="mt-4 divide-y divide-line-soft text-sm">
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CalendarDays aria-hidden className="size-4" /> Appointment
            </dt>
            <dd className="font-semibold text-ink">{orderData.date}</dd>
          </div>
          <div className="flex justify-between gap-4 py-2.5">
            <dt className="flex items-center gap-2 text-ink-muted">
              <CreditCard aria-hidden className="size-4" /> Payment
            </dt>
            <dd className="font-semibold text-ink">
              {orderData.paymentMethod === "Subscription"
                ? "Membership"
                : orderData.paymentMethod}
            </dd>
          </div>
        </dl>

        <h3 className="mt-6 font-bold text-ink">What you booked</h3>
        <dl className="mt-2 divide-y divide-line-soft border-y border-line-soft text-sm">
          {orderData.items.map((item, index) => (
            <div key={index} className="flex justify-between gap-4 py-2.5">
              <dt className="flex items-center gap-2 font-medium text-ink">
                <Sparkles aria-hidden className="size-4 shrink-0 text-svc-detail-mark" />
                {item.name}
              </dt>
              <dd className="tabular-nums text-ink">${item.price.toFixed(2)}</dd>
            </div>
          ))}
          {/* Only show add-ons when paid for */}
          {addOnsPaid &&
            addOns.map((addon) => (
              <div key={addon.id} className="flex justify-between gap-4 py-2.5 pl-6">
                <dt className="text-ink-muted">Add-on: {addon.name}</dt>
                <dd className="tabular-nums text-ink">${addon.price.toFixed(2)}</dd>
              </div>
            ))}
        </dl>

        <dl className="mt-2 text-sm">
          <div className="flex justify-between gap-4 py-1.5">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums text-ink">${orderData.subtotal.toFixed(2)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between gap-4 py-1.5">
              <dt className="text-ink-muted">
                Discount ({orderData.discountPercent ?? 0}% off)
              </dt>
              <dd className="tabular-nums text-ink">&minus;${discount.toFixed(2)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-1.5">
            <dt className="text-ink-muted">Tax</dt>
            <dd className="tabular-nums text-ink">${orderData.tax.toFixed(2)}</dd>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="text-xl font-black tabular-nums tracking-tight text-ink">
              ${orderData.total.toFixed(2)}
            </dd>
          </div>
        </dl>

        <p className="mt-4 break-all text-xs text-ink-subtle">
          Reference {orderData.orderNumber}
        </p>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/dashboard/bookings"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          See your bookings <ArrowRight aria-hidden className="size-4" />
        </Link>
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 font-semibold text-ink ring-1 ring-line hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <MapPin aria-hidden className="size-4 text-brand-blue" /> Get directions
        </a>
      </div>

      <p className="mt-6 text-sm text-ink-muted">
        Need to change something? Call{" "}
        <a
          href="tel:+18322198320"
          className="rounded font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          (832) 219-8320
        </a>{" "}
        or email{" "}
        <a
          href="mailto:info@thelaunchpadwash.com"
          className="rounded font-semibold text-ink underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          info@thelaunchpadwash.com
        </a>
        .
      </p>
    </div>
  );
}

/** "YYYY-MM-DD" is a calendar date, not an instant: format it in UTC so the
 * server's own time zone can never move it to the previous day. */
function formatCalendarDate(value: string): string {
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}
