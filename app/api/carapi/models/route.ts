import { getCarApiToken } from "@/lib/carapi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");
    const make = searchParams.get("make");

    if (!year || !make) {
      return NextResponse.json({ error: "Missing year or make" }, { status: 400 });
    }

    const token = await getCarApiToken();

    const res = await fetch(
      `https://carapi.app/api/models/v2?year=${year}&make=${encodeURIComponent(make)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) return NextResponse.json(await res.json(), { status: res.status });

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
