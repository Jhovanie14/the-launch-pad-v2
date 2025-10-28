import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { email, firstName, lastName, phone, message, concern, subConcern } =
    await req.json();

  if (!email || !message || !concern) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const { error } = await supabase.from("contacts").insert([
      {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        concern,
        sub_concern: subConcern || null,
        message,
        status: "new",
      },
    ]);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving contact:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}
