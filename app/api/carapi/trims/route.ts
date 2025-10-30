import { NextResponse } from "next/server";
import { getCarApiToken } from "@/lib/carapi";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const make = searchParams.get("make");
    const model = searchParams.get("model");

    if (!year || !make || !model) {
      return NextResponse.json(
        { error: "Missing year, make or model" },
        { status: 400 }
      );
    }

    const token = await getCarApiToken();
    const res = await fetch(
      `https://carapi.app/api/trims/v2?year=${year}&make=${encodeURIComponent(
        make
      )}&model=${encodeURIComponent(model)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status });
    }

    const payload = await res.json();
    const raw = Array.isArray(payload?.data) ? payload.data : [];

    // Deduplicate by trim name, keep first id
    const map: Record<string, { id: number; trim: string }> = {};
    for (const item of raw) {
      const name = String(item?.trim ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (!map[key]) {
        map[key] = { id: Number(item?.id), trim: name };
      }
    }
    const unique = Object.values(map);

    return NextResponse.json({ data: unique });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
