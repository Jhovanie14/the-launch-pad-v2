// app/api/carapi/years/route.ts
import { NextResponse } from "next/server";
import { getCarApiToken } from "@/lib/carapi";

export async function GET() {
  try {
    const token = await getCarApiToken();

    const res = await fetch("https://carapi.app/api/years/v2", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
