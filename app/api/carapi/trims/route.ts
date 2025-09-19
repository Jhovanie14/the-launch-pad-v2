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

    if (!res.ok)
      return NextResponse.json(await res.json(), { status: res.status });

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
