// ==========================================
// FILE: /api/admin/fleet-contracts/route.ts
// ==========================================
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { NextResponse } from "next/server";

// GET - Fetch all fleet contracts
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const { data, error } = await supabase
      .from("fleet_contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return apiError(error);
  }
}

// POST - Create new fleet contract
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const body = await request.json();

    const { data, error } = await supabase
      .from("fleet_contracts")
      .insert({
        inquiry_id: body.inquiry_id,
        company_name: body.company_name,
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone,
        fleet_size: body.fleet_size,
        contract_type: body.contract_type,
        monthly_rate: body.monthly_rate,
        discount_percentage: body.discount_percentage || 0,
        start_date: body.start_date,
        end_date: body.end_date || null,
        status: "active",
        payment_terms: body.payment_terms,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: Update the inquiry status to "closed" since it has a contract
    if (body.inquiry_id) {
      await supabase
        .from("fleet_inquiries")
        .update({ status: "closed" })
        .eq("id", body.inquiry_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return apiError(error);
  }
}

// PATCH - Update fleet contract
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const body = await request.json();
    const { id, ...updateData } = body;

    const { data, error } = await supabase
      .from("fleet_contracts")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return apiError(error);
  }
}

// DELETE - Delete fleet contract
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    await requireAdmin(supabase, createAdminClient());

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Contract ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("fleet_contracts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
