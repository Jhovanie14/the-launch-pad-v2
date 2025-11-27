// ==========================================
// FILE: /api/admin/fleet-invoices/route.ts
// ==========================================
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET - Fetch all fleet invoices
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("fleet_invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Check for overdue invoices and update status
    const today = new Date().toISOString().split("T")[0];
    const overdueInvoices = data?.filter(
      (inv: any) => inv.status === "sent" && inv.due_date < today
    );

    if (overdueInvoices && overdueInvoices.length > 0) {
      for (const invoice of overdueInvoices) {
        await supabase
          .from("fleet_invoices")
          .update({ status: "overdue" })
          .eq("id", invoice.id);
      }
      // Refetch to get updated data
      const { data: updatedData } = await supabase
        .from("fleet_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      return NextResponse.json(updatedData);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fleet invoices fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST - Create new fleet invoice
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

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(supabase);

    const { data, error } = await supabase
      .from("fleet_invoices")
      .insert({
        contract_id: body.contract_id,
        invoice_number: invoiceNumber,
        company_name: body.company_name,
        amount: body.amount,
        issue_date: body.issue_date,
        due_date: body.due_date,
        status: "sent", // Default to sent
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fleet invoice creation error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}

// PATCH - Update fleet invoice (e.g., mark as paid)
export async function PATCH(request: Request) {
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
    const { id, status, payment_date } = body;

    const updateData: any = { status };
    if (payment_date) {
      updateData.payment_date = payment_date;
    }

    const { data, error } = await supabase
      .from("fleet_invoices")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Fleet invoice update error:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}

// Helper function to generate invoice number
async function generateInvoiceNumber(supabase: any): Promise<string> {
  const { data } = await supabase
    .from("fleet_invoices")
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return "INV-000001";
  }

  const lastInvoice = data[0].invoice_number;
  const lastNumber = parseInt(lastInvoice.split("-")[1]);
  const nextNumber = lastNumber + 1;

  return `INV-${nextNumber.toString().padStart(6, "0")}`;
}
