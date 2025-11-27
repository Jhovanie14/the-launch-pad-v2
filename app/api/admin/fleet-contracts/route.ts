// ==========================================
// FILE: /api/admin/fleet-contracts/route.ts
// ==========================================
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

// GET - Fetch all fleet contracts
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

    // Optional: Add admin role check
    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('role')
    //   .eq('id', user.id)
    //   .single();
    // if (profile?.role !== 'admin') {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const { data, error } = await supabase
      .from("fleet_contracts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Fleet contracts fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

// POST - Create new fleet contract
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
    console.error("Fleet contract creation error:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}

// PATCH - Update fleet contract
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
    console.error("Fleet contract update error:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

// DELETE - Delete fleet contract
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    console.error("Fleet contract deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
