import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/guards";

/** Throw for expected, client-safe errors (validation, business rules). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Convert any thrown error into a safe NextResponse.
 * Known errors (AuthError/ApiError) expose their message; everything else
 * is logged server-side and returned as a generic 500.
 */
export function apiError(err: unknown): NextResponse {
  if (err instanceof AuthError || err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
