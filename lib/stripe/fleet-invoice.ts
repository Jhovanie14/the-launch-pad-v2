import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function createStripeFleetInvoice({
  contractId,
  companyName,
  email,
  amount,
  dueDate,
  invoiceNumber,
  description,
}: {
  contractId: string;
  companyName: string;
  email: string;
  amount: number;
  dueDate: string;
  invoiceNumber: string;
  description?: string;
}) {
  try {
    // 1. Create or retrieve Stripe customer
    let customer = await findOrCreateStripeCustomer(email, companyName);

    // 2. Create invoice
    const invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: "send_invoice", // Email invoice to customer
      days_until_due: calculateDaysUntilDue(dueDate),
      description: description || `Fleet Services - ${companyName}`,
      metadata: {
        contract_id: contractId,
        invoice_number: invoiceNumber,
      },
      auto_advance: true, // Automatically finalize
    });

    // 3. Add line item
    await stripe.invoiceItems.create({
      customer: customer.id,
      invoice: invoice.id,
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      description: `${invoiceNumber} - Fleet Car Wash Services`,
    });

    // 4. Finalize and send invoice
    const invoiceId = invoice.id!;
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoiceId);
    await stripe.invoices.sendInvoice(invoiceId);

    return {
      success: true,
      stripeInvoiceId: finalizedInvoice.id,
      hostedInvoiceUrl: finalizedInvoice.hosted_invoice_url,
      invoicePdf: finalizedInvoice.invoice_pdf,
    };
  } catch (error) {
    console.error("Stripe invoice creation error:", error);
    throw error;
  }
}

async function findOrCreateStripeCustomer(email: string, name: string) {
  // Try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email: email,
    name: name,
    description: `Fleet Customer - ${name}`,
  });
}

function calculateDaysUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 1); // Minimum 1 day
}
