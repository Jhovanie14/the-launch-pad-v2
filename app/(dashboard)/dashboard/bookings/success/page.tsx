import { CheckCircle, Package, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { OrderData } from "@/types";

interface SuccessPageProps {
  searchParams: { session_id?: string; booking_id?: string };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const supabase = createClient();

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
        ? new Date(bookingMeta.ad).toLocaleDateString()
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
      date: new Date(booking.appointment_date).toLocaleDateString(), // ✅ FIXED date
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

  // ✅ UI rendering
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            Payment Successful!
          </h1>
          <p className="text-muted-foreground text-lg">
            Thank you for your purchase. Your order has been confirmed.
          </p>
        </div>

        {/* Order Details */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" /> Booking Date
              </div>
              <span className="font-medium">{orderData.date}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Booking Number</span>
              <span className="font-medium">{orderData.orderNumber}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" /> Payment Method
              </div>
              <span className="font-medium">{orderData.paymentMethod}</span>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">Items Purchased</h4>
              {orderData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{item.name}</span>
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
              {/* ✅ Only show add-ons when paid for */}
              {orderData.type === "checkout" && addOns.length > 0 && (
                <div className="pl-4 mt-2 space-y-1">
                  <span className="text-sm text-muted-foreground font-medium block">
                    Add-ons
                  </span>
                  {addOns.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex justify-between items-center text-sm pl-2"
                    >
                      <span>- {addon.name}</span>
                      <span>${addon.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${orderData.subtotal.toFixed(2)}</span>
              </div>

              {orderData.discountAmount && orderData.discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Discount ({orderData.discountPercent ?? 0}%)</span>
                  <span>- ${orderData.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${orderData.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">
                  ${orderData.total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8 p-4 bg-card rounded-lg border mb-4">
          <p className="text-sm text-green-500">
            A confirmation email has been sent to your registered email address.
            If you have any questions, please contact our support team.
          </p>
        </div>

        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard/bookings">View Your Bookings</Link>
          </Button>
          {/* <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/">Continue Shopping</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/support">Contact Support</Link>
            </Button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
