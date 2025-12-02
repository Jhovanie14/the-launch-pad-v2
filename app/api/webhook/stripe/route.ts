import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error: any) {
      return new Response(`Webhook Error: ${error.message}`, { status: 400 });
    }
    // Handle invoice paid event
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
    }

    // Handle invoice payment failed
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaymentFailed(invoice);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 400 }
    );
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fleet_invoices")
    .update({
      status: "paid",
      payment_date: new Date().toISOString(),
    })
    .eq("stripe_invoice_id", invoice.id);

  console.log("Invoice found in DB:", data);

  if (error) {
    console.error("Failed to update invoice:", error);
  } else {
    console.log(`✅ Invoice ${invoice.id} marked as paid`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("fleet_invoices")
    .update({
      status: "overdue",
    })
    .eq("stripe_invoice_id", invoice.id);

  if (error) {
    console.error("Failed to update invoice:", error);
  } else {
    console.log(`⚠️ Invoice ${invoice.id} payment failed`);
  }
}
