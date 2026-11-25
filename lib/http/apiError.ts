import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/guards";

/** Throw for expected, client-safe errors (validation, business rules). */
export class ApiError extends Error {
  status: number;
  /** Optional client-safe data the UI needs (e.g. a new price, an address suggestion). */
  details?: unknown;
  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

/**
 * Convert any thrown error into a safe NextResponse.
 * Known errors (AuthError/ApiError) expose their message; everything else
 * is logged server-side and returned as a generic 500.
 */
export function apiError(err: unknown): NextResponse {
  if (err instanceof ApiError && err.details !== undefined) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof AuthError || err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[api] unhandled error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
