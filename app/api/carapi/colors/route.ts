// app/api/carapi/colors/route.ts
import { getCarApiToken } from "@/lib/carapi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const trimId = searchParams.get("trim_id");
    const styleId = searchParams.get("style_id");
    const year = searchParams.get("year");
    const make = searchParams.get("make");
    const model = searchParams.get("model");
    const trim = searchParams.get("trim");
    if (!trimId && !styleId) {
      return NextResponse.json(
        { error: "Missing trim_id or style_id" },
        { status: 400 }
      );
    }

    const token = await getCarApiToken();

    const params = new URLSearchParams();
    if (trimId) params.set("trim_id", trimId);
    if (styleId) params.set("style_id", styleId);
    if (year) params.set("year", year);
    if (make) params.set("make", make);
    if (model) params.set("model", model);
    if (trim) params.set("trim", trim);

    const res = await fetch(
      `https://carapi.app/api/exterior-colors/v2?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
