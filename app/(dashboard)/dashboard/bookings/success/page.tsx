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
interface BookingAddOnRow {
  add_ons: {
    id: string;
    name: string;
    price: number;
  };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const supabase = createClient();

  let orderData: OrderData | null = null;
  let addOns: { id: string; name: string; price: number }[] = [];

  // Stripe Checkout booking
  if (params.session_id) {
    const session = await stripe.checkout.sessions.retrieve(params.session_id, {
      expand: ["line_items", "payment_intent"],
    });

    if (session.status === "open") return redirect("/");

    const bookingMeta = session.metadata?.booking
      ? JSON.parse(session.metadata.booking)
      : null;

    const items = [
      {
        name: bookingMeta?.service_package_name ?? "Service Package",
        price: bookingMeta?.service_package_price ?? 0,
        quantity: 1,
      },
    ];

    // Fetch add-ons from booking_add_ons table
    if (bookingMeta?.booking_id) {
      const { data: addOnsData, error } = await supabase
        .from("booking_add_ons")
        .select(
          `
        add_ons (
          id,
          name,
          price
        )
      `
        )
        .eq("booking_id", bookingMeta.booking_id);

      if (error) {
        console.error("Error fetching add-ons:", error);
        addOns = [];
      } else {
        // Flatten the nested arrays
        addOns = addOnsData?.map((row: any) => row.add_ons) ?? [];
      }
    }

    const subtotal =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
      addOns.reduce((sum, a) => sum + a.price, 0);
    const tax = (session.total_details?.amount_tax ?? 0) / 100;
    const total = (session.amount_total ?? 0) / 100;

    orderData = {
      type: "checkout",
      date: new Date(session.created * 1000).toLocaleDateString(),
      orderNumber:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : ((session.payment_intent as any)?.id ?? session.id),
      paymentMethod:
        (session.payment_intent as any)?.payment_method_types?.[0] ?? "Card",
      items,
      subtotal,
      tax,
      total,
    };
  }

  // Subscription-only booking
  else if (params.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, service_package_name, service_package_price, created_at")
      .eq("id", params.booking_id)
      .single();

    if (!booking) throw new Error("Booking not found");

    const items = [
      {
        name: booking.service_package_name ?? "Service Package",
        price: booking.service_package_price ?? 0,
        quantity: 1,
      },
    ];

    // Fetch add-ons via join table
    const { data: addOnsData, error } = await supabase
      .from("booking_add_ons")
      .select(`add_ons(id, name, price)`)
      .eq("booking_id", booking.id);

    if (error) {
      console.error("Error fetching add-ons:", error);
      addOns = [];
    } else {
      addOns = addOnsData?.flatMap((row: any) => row.add_ons) ?? [];
    }

    const subtotal =
      items.reduce((sum, i) => sum + i.price * i.quantity, 0) +
      addOns.reduce((sum, a) => sum + a.price, 0);

    orderData = {
      type: "subscription",
      date: new Date(booking.created_at).toLocaleDateString(),
      orderNumber: booking.id,
      paymentMethod: "Subscription",
      items,
      subtotal,
      tax: 0,
      total: subtotal,
    };
  }

  if (!orderData) throw new Error("No session_id or booking_id provided");

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-secondary" />
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
            {/* Booking Info */}
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

            {/* Items Purchased */}
            <div className="space-y-3">
              <h4 className="font-medium">Items Purchased</h4>
              {orderData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{item.name}</span>
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
              {addOns.length > 0 && (
                <div className="pl-4 space-y-1 mt-1">
                  {addOns.map((addon) => (
                    <div
                      key={addon.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <span>- {addon.name}</span>
                      <span>${addon.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${orderData.subtotal.toFixed(2)}</span>
              </div>
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

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button asChild className="w-full" size="lg">
            <Link href="/dashboard/bookings">View Your Bookings</Link>
          </Button>
          <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/">Continue Shopping</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">
            A confirmation email has been sent to your registered email address.
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
