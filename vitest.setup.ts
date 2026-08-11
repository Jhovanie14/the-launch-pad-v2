import { beforeEach, vi } from "vitest";

// Email modules construct a Resend client at import time; give tests a dummy
// key so importing them doesn't throw (no test ever sends real email).
process.env.RESEND_API_KEY ??= "re_test_dummy";

beforeEach(() => {
  vi.restoreAllMocks();
});
