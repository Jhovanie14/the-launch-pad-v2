import { describe, expect, it, vi } from "vitest";
import { apiError, ApiError } from "./apiError";
import { AuthError } from "@/lib/auth/guards";

describe("apiError", () => {
  it("uses AuthError status and message", async () => {
    const res = apiError(new AuthError("Forbidden", 403));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
  });

  it("uses ApiError status and message", async () => {
    const res = apiError(new ApiError("Bad input", 400));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad input" });
  });

  it("hides internal error detail behind a generic 500 message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = apiError(new Error("DB password leaked in message"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    spy.mockRestore();
  });
});
