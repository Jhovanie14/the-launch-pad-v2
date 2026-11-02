import { ApiError } from "@/lib/http/apiError";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON_LENGTH = 500;

/** `{ userId, reason }` — shared by block and unblock. */
export function parseCustomerBlockRequest(body: unknown): { userId: string; reason: string } {
  const { userId, reason: rawReason } = (body ?? {}) as { userId?: unknown; reason?: unknown };
  const reason = typeof rawReason === "string" ? rawReason.trim() : "";

  if (typeof userId !== "string" || !UUID.test(userId)) {
    throw new ApiError("A valid userId is required", 400);
  }
  if (!reason) throw new ApiError("A reason is required", 400);
  if (reason.length > MAX_REASON_LENGTH) {
    throw new ApiError(`Keep the reason under ${MAX_REASON_LENGTH} characters`, 400);
  }
  return { userId, reason };
}
