import { NextResponse } from "next/server";
import { getCarApiToken } from "@/lib/carapi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const trim = searchParams.get("trim");

    if (!year || !make || !model || !trim) {
      return NextResponse.json(
        { error: "Missing required query params: year, make, model, trim" },
        { status: 400 }
      );
    }

    const token = await getCarApiToken();

    const res = await fetch(
      `https://carapi.app/api/bodies/v2?year=${year}&make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}&trim=${encodeURIComponent(trim)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const errorPayload = await res.json();
      return NextResponse.json(errorPayload, { status: res.status });
    }

    const payload = await res.json();
    // CarAPI shape: { collection: {...}, data: [{ type: "Cargo Van", ... }] }
    const bodyType = Array.isArray(payload?.data) && payload.data.length > 0
      ? payload.data[0]?.type ?? null
      : null;

    return NextResponse.json({ body_type: bodyType, source: 'carapi', raw: payload });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
