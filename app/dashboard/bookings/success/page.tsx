import { CheckCircle, Package, Calendar, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { stripe } from "@/lib/stripe/stripe";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface SuccessPageProps {
  searchParams: { session_id?: string };
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const session_id = params.session_id;

  if (!session_id)
    throw new Error("Please provide a valid session_id (`cs_test_...`)");

  // Retrieve Stripe session
  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ["line_items", "payment_intent"],
  });

  if (session.status === "open") {
    return redirect("/");
  }

  // Parse booking metadata
  const bookingMeta = session.metadata?.booking
    ? JSON.parse(session.metadata.booking)
    : null;

  const supabase = createClient();

  // Fetch add-ons if any
  let addOns: { id: string; name: string; price: number }[] = [];
  if (bookingMeta?.add_ons_id?.length) {
    const { data: addOnsData, error } = await supabase
      .from("add_ons")
      .select("id, name, price")
      .eq("id", bookingMeta.add_ons_id);

    if (error) console.error("Error fetching add-ons:", error);
    addOns = addOnsData ?? [];
  }

  // Build items array
  const items = [
    {
      name: bookingMeta?.service_package_name ?? "Service Package",
      price: bookingMeta?.service_package_price ?? 0,
      quantity: 1,
    },
    ...addOns.map((a) => ({
      name: a.name,
      price: a.price,
      quantity: 1,
    })),
  ];

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = (session.total_details?.amount_tax ?? 0) / 100;
  const total = (session.amount_total ?? 0) / 100;

  const orderData = {
    date: new Date(session.created * 1000).toLocaleDateString(),
    orderNumber:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? session.id,
    paymentMethod:
      (session.payment_intent as any)?.payment_method_types?.[0] ?? "Card",
    items,
    subtotal,
    tax,
    total,
  };
  console.log(orderData.items);
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-secondary" />
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            {"Payment Successful!"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {"Thank you for your purchase. Your order has been confirmed."}
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {"Order Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info */}
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {"Order Date"}
              </div>
              <span className="font-medium">{orderData.date}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">{"Order Number"}</span>
              <span className="font-medium">{orderData.orderNumber}</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                {"Payment Method"}
              </div>
              <span className="font-medium">{orderData.paymentMethod}</span>
            </div>

            <Separator />

            {/* Items */}
            <div className="space-y-3">
              <h4 className="font-medium">{"Items Purchased"}</h4>
              {orderData.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{item.name}</span>
                  <span className="font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{"Subtotal"}</span>
                <span>${orderData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{"Tax"}</span>
                <span>${orderData.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>{"Total"}</span>
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
            <Link href="/dashboard/bookings">{"View Your Bookings"}</Link>
          </Button>

          <div className="flex gap-4">
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/">{"Continue Shopping"}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 bg-transparent">
              <Link href="/support">{"Contact Support"}</Link>
            </Button>
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center mt-8 p-4 bg-card rounded-lg border">
          <p className="text-sm text-muted-foreground">
            {
              "A confirmation email has been sent to your registered email address. "
            }
            {
              "If you have any questions, please don't hesitate to contact our support team."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
