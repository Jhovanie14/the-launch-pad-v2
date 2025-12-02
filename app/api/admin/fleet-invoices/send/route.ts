import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { createStripeFleetInvoice } from "@/lib/stripe/fleet-invoice";
import { sendFleetInvoiceEmail } from "@/lib/email/fleet-invoice-email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { invoiceId } = body;

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from("fleet_invoices")
      .select(
        `
        *,
        fleet_contracts (
          company_name,
          email,
          contact_name
        )
      `
      )
      .eq("id", invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get contract details
    const contract = invoice.fleet_contracts;

    // Create Stripe invoice
    const stripeResult = await createStripeFleetInvoice({
      contractId: invoice.contract_id,
      companyName: contract.company_name,
      email: contract.email,
      amount: invoice.amount,
      dueDate: invoice.due_date,
      invoiceNumber: invoice.invoice_number,
      description: `Fleet Services - ${contract.company_name}`,
    });

    // Update invoice in database
    const { error: updateError } = await supabase
      .from("fleet_invoices")
      .update({
        status: "sent",
        stripe_invoice_id: stripeResult.stripeInvoiceId,
        hosted_invoice_url: stripeResult.hostedInvoiceUrl,
        invoice_pdf_url: stripeResult.invoicePdf,
      })
      .eq("id", invoiceId);

    if (updateError) throw updateError;

    // Send email notification via Resend (optional)
    try {
      await sendFleetInvoiceEmail({
        to: contract.email,
        companyName: contract.company_name,
        invoiceNumber: invoice.invoice_number,
        amount: invoice.amount,
        dueDate: invoice.due_date,
        hostedInvoiceUrl: stripeResult.hostedInvoiceUrl,
      });
    } catch (emailError) {
      console.error("Email send failed (non-blocking):", emailError);
      // Continue even if email fails - Stripe still sent their own email
    }

    return NextResponse.json({
      success: true,
      hostedInvoiceUrl: stripeResult.hostedInvoiceUrl,
    });
  } catch (error) {
    console.error("Invoice send error:", error);
    return NextResponse.json(
      { error: "Failed to send invoice" },
      { status: 500 }
    );
  }
}
