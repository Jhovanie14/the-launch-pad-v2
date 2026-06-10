# Phase 1 Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close payment- and access-control gaps in the production carwash app by routing every route through shared auth, server-side price, error, logging, and email-escaping primitives, plus hardening the Stripe webhook and RLS.

**Architecture:** Introduce small, unit-tested primitives under `lib/` (`auth/guards`, `pricing/computeBookingAmount`, `email/escapeHtml`, `http/apiError`, `log/logger`) and migrate the vulnerable routes to use them. The client may never decide a price, a role, or a payment method — the server recomputes all three from the database. Stripe webhook becomes idempotent and re-validates IDs.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Supabase (`@supabase/supabase-js`), Stripe, Resend, Vitest (added here for unit tests).

**Source spec:** `docs/superpowers/specs/2026-06-11-phase-1-security-design.md`

**Locked decisions:** strict server price authority; `profiles.role` is the only authorization source (drop `user_type`); rate limiting deferred.

---

## File Structure

**New files**
- `lib/auth/guards.ts` — `requireUser()`, `requireAdmin()`, `AuthError`.
- `lib/auth/guards.test.ts` — unit tests.
- `lib/pricing/computeBookingAmount.ts` — server-side authoritative price computation.
- `lib/pricing/computeBookingAmount.test.ts` — unit tests.
- `lib/email/escapeHtml.ts` — `escapeHtml()`, `isAllowedBannerUrl()`.
- `lib/email/escapeHtml.test.ts` — unit tests.
- `lib/http/apiError.ts` — `apiError()`, `ApiError`.
- `lib/http/apiError.test.ts` — unit tests.
- `lib/log/logger.ts` — environment-aware logger.
- `lib/log/logger.test.ts` — unit tests.
- `supabase/migrations/<ts>_stripe_event_idempotency.sql` — `processed_stripe_events` table.
- `vitest.config.ts`, `vitest.setup.ts` — test runner config.

**Modified files**
- `app/api/create-walkin-checkout/route.ts`, `app/api/create-booking-checkout/route.ts`, `app/api/broadcast/route.ts`, `app/api/invite-admin/route.ts` — add guards.
- `app/api/checkout_sessions/route.ts` — server-side price authority.
- `app/api/admin/send-direct-email/route.ts`, `app/api/broadcast/route.ts` — email escaping.
- `app/api/webhook/route.ts` — idempotency + metadata re-validation.
- `lib/stripe/stripe.ts` — pin `apiVersion`.

---

## Task 0: Set up Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Modify: `package.json` (scripts + devDeps)

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm i -D vitest @vitest/coverage-v8 --no-audit --no-fund
```
Expected: packages added to `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import { beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
});
```

- [ ] **Step 4: Add test script to `package.json`**

In `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create a smoke test and run it**

Create `lib/__smoke__.test.ts`:
```ts
import { expect, test } from "vitest";
test("vitest runs", () => {
  expect(1 + 1).toBe(2);
});
```
Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm lib/__smoke__.test.ts
git add package.json vitest.config.ts vitest.setup.ts package-lock.json
git commit -m "chore: add vitest test infrastructure"
```

---

## Task 1: Auth guards (`requireUser`, `requireAdmin`)

**Files:**
- Create: `lib/auth/guards.ts`
- Test: `lib/auth/guards.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { AuthError, requireAdmin, requireUser } from "./guards";

function fakeServerClient(user: any) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}
function fakeAdminClient(role: string | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
        }),
      }),
    }),
  };
}

describe("requireUser", () => {
  it("returns the user when authenticated", async () => {
    const user = { id: "u1", email: "a@b.com" };
    const result = await requireUser(fakeServerClient(user) as any);
    expect(result.id).toBe("u1");
  });

  it("throws AuthError(401) when not authenticated", async () => {
    await expect(requireUser(fakeServerClient(null) as any)).rejects.toMatchObject({
      status: 401,
    });
    expect(AuthError).toBeTruthy();
  });
});

describe("requireAdmin", () => {
  it("returns the user when role is admin", async () => {
    const user = { id: "u1" };
    const result = await requireAdmin(
      fakeServerClient(user) as any,
      fakeAdminClient("admin") as any
    );
    expect(result.id).toBe("u1");
  });

  it("throws AuthError(403) when role is not admin", async () => {
    const user = { id: "u1" };
    await expect(
      requireAdmin(fakeServerClient(user) as any, fakeAdminClient("user") as any)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws AuthError(401) when not authenticated", async () => {
    await expect(
      requireAdmin(fakeServerClient(null) as any, fakeAdminClient("admin") as any)
    ).rejects.toMatchObject({ status: 401 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/guards.test.ts`
Expected: FAIL — cannot find module `./guards`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { SupabaseClient, User } from "@supabase/supabase-js";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/** Returns the authenticated user or throws AuthError(401). */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

/**
 * Returns the authenticated user if they are an admin, else throws.
 * Role is read from profiles.role using the admin client (single source of truth).
 */
export async function requireAdmin(
  supabase: SupabaseClient,
  admin: SupabaseClient
): Promise<User> {
  const user = await requireUser(supabase);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new AuthError("Forbidden", 403);
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/guards.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/auth/guards.ts lib/auth/guards.test.ts
git commit -m "feat: add requireUser/requireAdmin auth guards"
```

---

## Task 2: Safe API error wrapper

**Files:**
- Create: `lib/http/apiError.ts`
- Test: `lib/http/apiError.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/http/apiError.test.ts`
Expected: FAIL — cannot find module `./apiError`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/http/apiError.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/http/apiError.ts lib/http/apiError.test.ts
git commit -m "feat: add safe apiError wrapper and ApiError class"
```

---

## Task 3: Environment-aware logger

**Files:**
- Create: `lib/log/logger.ts`
- Test: `lib/log/logger.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "./logger";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger", () => {
  it("suppresses debug/info in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.debug("secret");
    logger.info("secret");
    expect(log).not.toHaveBeenCalled();
  });

  it("always logs errors", () => {
    vi.stubEnv("NODE_ENV", "production");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("boom");
    expect(err).toHaveBeenCalledWith("boom");
  });

  it("logs debug/info outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello");
    expect(log).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/log/logger.test.ts`
Expected: FAIL — cannot find module `./logger`.

- [ ] **Step 3: Write minimal implementation**

```ts
const isProd = () => process.env.NODE_ENV === "production";

export const logger = {
  debug: (...args: unknown[]) => {
    if (!isProd()) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (!isProd()) console.log(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/log/logger.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/log/logger.ts lib/log/logger.test.ts
git commit -m "feat: add environment-aware logger"
```

---

## Task 4: Email escaping + banner URL allowlist

**Files:**
- Create: `lib/email/escapeHtml.ts`
- Test: `lib/email/escapeHtml.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { escapeHtml, isAllowedBannerUrl } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")&'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;"
    );
  });
  it("returns empty string for nullish input", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("isAllowedBannerUrl", () => {
  it("allows https URLs on the Supabase storage host", () => {
    expect(
      isAllowedBannerUrl(
        "https://knbixjluxzodnisuhkii.supabase.co/storage/v1/object/public/x.png"
      )
    ).toBe(true);
  });
  it("rejects other hosts and non-https", () => {
    expect(isAllowedBannerUrl("https://evil.com/x.png")).toBe(false);
    expect(isAllowedBannerUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedBannerUrl("")).toBe(false);
    expect(isAllowedBannerUrl(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/email/escapeHtml.test.ts`
Expected: FAIL — cannot find module `./escapeHtml`.

- [ ] **Step 3: Write minimal implementation**

```ts
const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string | null | undefined): string {
  if (input == null) return "";
  return String(input).replace(/[&<>"']/g, (ch) => MAP[ch]);
}

/** Only allow https banner images hosted on our Supabase storage domain. */
export function isAllowedBannerUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/email/escapeHtml.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/email/escapeHtml.ts lib/email/escapeHtml.test.ts
git commit -m "feat: add email HTML escaping and banner URL allowlist"
```

---

## Task 5: Server-side price authority (`computeBookingAmount`)

This is the core anti-fraud module. It recomputes the authoritative amount from the DB and decides whether a booking is free, never trusting client prices. Holiday sale and promo handling are included to match the current frontend behavior.

**Files:**
- Create: `lib/pricing/computeBookingAmount.ts`
- Test: `lib/pricing/computeBookingAmount.test.ts`

- [ ] **Step 1: Confirm plan-name → free-category mapping (discovery step)**

Run in Supabase Dashboard → SQL Editor:
```sql
select id, name from subscription_plans;
select distinct category from service_packages;
```
Record the exact `name` strings. The frontend treats a plan as covering "quick service" if its name implies quick service, and "express detail" for express/commercial plans (`app/(dashboard)/dashboard/booking/confirmation/page.tsx:97-105`). Confirm the keyword matching in Step 3 matches the real names; adjust the keyword list in `planCoversCategory` if the names differ.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, it, vi } from "vitest";
import { computeBookingAmount } from "./computeBookingAmount";

/** Minimal fake Supabase that resolves table reads from a fixture map. */
function fakeDb(fixtures: {
  service?: any;
  addOns?: any[];
  subscription?: any;
  plan?: any;
  vehicleSubscribed?: boolean;
}) {
  return {
    from(table: string) {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: () => api,
        maybeSingle: async () => {
          if (table === "service_packages") return { data: fixtures.service ?? null };
          if (table === "user_subscription") return { data: fixtures.subscription ?? null };
          if (table === "subscription_plans") return { data: fixtures.plan ?? null };
          return { data: null };
        },
        single: async () => api.maybeSingle(),
        then: undefined,
      };
      if (table === "add_ons") {
        // `.in("id", ids)` returns a list
        return { select: () => ({ in: async () => ({ data: fixtures.addOns ?? [] }) }) };
      }
      return api;
    },
  } as any;
}

describe("computeBookingAmount", () => {
  it("charges base + add-ons for a non-subscriber", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 50, category: "express detail" },
      addOns: [{ id: "a1", price: 10 }],
    });
    const result = await computeBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1"],
      userId: null,
      isAuthenticated: false,
      paymentMethod: "card",
    });
    expect(result.amount).toBe(60);
    expect(result.isFree).toBe(false);
  });

  it("makes the service free when subscription plan covers the category", async () => {
    const db = fakeDb({
      service: { id: "s1", price: 50, category: "express detail" },
      addOns: [{ id: "a1", price: 10 }],
      subscription: { id: "sub1", subscription_plan_id: "p1", status: "active" },
      plan: { id: "p1", name: "Express Detail Monthly" },
    });
    const result = await computeBookingAmount(db, {
      servicePackageId: "s1",
      addOnIds: ["a1"],
      userId: "u1",
      isAuthenticated: true,
      paymentMethod: "subscription",
    });
    expect(result.amount).toBe(10); // base free, add-on still charged
    expect(result.isFree).toBe(true);
  });

  it("rejects cash for unauthenticated users", async () => {
    const db = fakeDb({ service: { id: "s1", price: 50, category: "x" } });
    await expect(
      computeBookingAmount(db, {
        servicePackageId: "s1",
        addOnIds: [],
        userId: null,
        isAuthenticated: false,
        paymentMethod: "cash",
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("throws when the service package does not exist", async () => {
    const db = fakeDb({ service: null });
    await expect(
      computeBookingAmount(db, {
        servicePackageId: "missing",
        addOnIds: [],
        userId: null,
        isAuthenticated: false,
        paymentMethod: "card",
      })
    ).rejects.toMatchObject({ status: 400 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/pricing/computeBookingAmount.test.ts`
Expected: FAIL — cannot find module `./computeBookingAmount`.

- [ ] **Step 4: Write minimal implementation**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/http/apiError";

export interface ComputeInput {
  servicePackageId: string;
  addOnIds: string[];
  userId: string | null;
  isAuthenticated: boolean;
  paymentMethod: "card" | "cash" | "subscription";
}

export interface ComputeResult {
  amount: number; // dollars, authoritative
  isFree: boolean; // base service covered by subscription
  servicePrice: number; // authoritative base (0 when free)
  addOnsTotal: number;
}

/** Does the subscription plan name cover this service category for free? */
function planCoversCategory(planName: string, category: string): boolean {
  const name = planName.toLowerCase();
  const cat = category.toLowerCase();
  // Confirmed against subscription_plans.name in Task 5 Step 1.
  if (cat === "quick service") return name.includes("quick");
  if (cat === "express detail")
    return name.includes("express") || name.includes("commercial");
  return false;
}

/**
 * Recompute the authoritative booking amount from the database.
 * The client's prices are never trusted. Throws ApiError(400) on rule violations.
 */
export async function computeBookingAmount(
  db: SupabaseClient,
  input: ComputeInput
): Promise<ComputeResult> {
  if (input.paymentMethod === "cash" && !input.isAuthenticated) {
    throw new ApiError("Cash payment requires an account", 400);
  }

  const { data: service } = await db
    .from("service_packages")
    .select("id, price, category")
    .eq("id", input.servicePackageId)
    .maybeSingle();

  if (!service) throw new ApiError("Invalid service package", 400);

  let addOnsTotal = 0;
  if (input.addOnIds.length > 0) {
    const { data: addOns } = await db
      .from("add_ons")
      .select("id, price")
      .in("id", input.addOnIds);
    addOnsTotal = (addOns ?? []).reduce(
      (sum: number, a: any) => sum + Number(a.price),
      0
    );
  }

  let isFree = false;
  if (input.isAuthenticated && input.userId) {
    const { data: sub } = await db
      .from("user_subscription")
      .select("id, subscription_plan_id, status")
      .eq("user_id", input.userId)
      .eq("status", "active")
      .maybeSingle();

    if (sub) {
      const { data: plan } = await db
        .from("subscription_plans")
        .select("id, name")
        .eq("id", sub.subscription_plan_id)
        .maybeSingle();
      if (plan && planCoversCategory(plan.name, service.category ?? "")) {
        isFree = true;
      }
    }
  }

  const servicePrice = isFree ? 0 : Number(service.price);
  return {
    amount: servicePrice + addOnsTotal,
    isFree,
    servicePrice,
    addOnsTotal,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/pricing/computeBookingAmount.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/pricing/computeBookingAmount.ts lib/pricing/computeBookingAmount.test.ts
git commit -m "feat: add server-side authoritative booking price computation"
```

> **Note on promo/holiday:** promo discounts must be re-validated server-side against `promo_codes` before being applied, and the holiday-sale factor must be a server constant — not read from the client. These are wired in Task 6 where `checkout_sessions` consumes `computeBookingAmount`. Do not apply a client-sent discount factor.

---

## Task 5b: Server-side promo validation (`validatePromo`)

Promo codes must be validated and applied server-side; the client may not send a discount. The holiday sale is treated as a server-controlled constant (currently off — it was a winter sale).

**Files:**
- Create: `lib/pricing/validatePromo.ts`
- Test: `lib/pricing/validatePromo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { validatePromo } from "./validatePromo";

function fakeDb(promo: any, alreadyRedeemed = false) {
  return {
    from(table: string) {
      if (table === "promo_codes") {
        return {
          select: () => ({
            ilike: () => ({ maybeSingle: async () => ({ data: promo }) }),
          }),
        };
      }
      // promo_code_redemptions
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: alreadyRedeemed ? { id: 1 } : null,
              }),
            }),
          }),
        }),
      };
    },
  } as any;
}

describe("validatePromo", () => {
  it("applies a percent discount", async () => {
    const db = fakeDb({
      id: 1, discount_type: "percent", discount_percent: 10,
      discount_amount: 0, is_active: true, max_uses: null, used_count: 0,
      restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "SAVE10", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(90);
    expect(r.promoId).toBe(1);
  });

  it("applies a flat discount and never goes negative", async () => {
    const db = fakeDb({
      id: 2, discount_type: "flat", discount_percent: 0,
      discount_amount: 150, is_active: true, max_uses: null, used_count: 0,
      restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "BIG", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(0);
  });

  it("rejects an inactive code (no discount)", async () => {
    const db = fakeDb({ id: 3, is_active: false });
    const r = await validatePromo(db, { code: "OFF", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a maxed-out code", async () => {
    const db = fakeDb({
      id: 4, discount_type: "percent", discount_percent: 50,
      is_active: true, max_uses: 5, used_count: 5, restricted_to_service: null,
    });
    const r = await validatePromo(db, { code: "MAX", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a code already redeemed by the user", async () => {
    const db = fakeDb(
      { id: 5, discount_type: "percent", discount_percent: 50, is_active: true,
        max_uses: null, used_count: 0, restricted_to_service: null },
      true
    );
    const r = await validatePromo(db, { code: "ONCE", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("rejects a code restricted to a different service", async () => {
    const db = fakeDb({
      id: 6, discount_type: "percent", discount_percent: 50, is_active: true,
      max_uses: null, used_count: 0, restricted_to_service: "other-service",
    });
    const r = await validatePromo(db, { code: "SVC", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });

  it("returns no discount when no code is given", async () => {
    const db = fakeDb(null);
    const r = await validatePromo(db, { code: "", baseAmount: 100, userId: "u1", serviceId: "s1" });
    expect(r.discountedAmount).toBe(100);
    expect(r.promoId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/pricing/validatePromo.test.ts`
Expected: FAIL — cannot find module `./validatePromo`.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PromoInput {
  code: string;
  baseAmount: number;
  userId: string | null;
  serviceId: string;
}

export interface PromoResult {
  discountedAmount: number; // baseAmount when invalid
  promoId: number | null; // set only when a valid discount was applied
}

/**
 * Validate a promo code against the DB and return the discounted amount.
 * Any failure (inactive, maxed, restricted, already redeemed, missing) is a
 * silent no-op that returns the original amount — never throws.
 */
export async function validatePromo(
  db: SupabaseClient,
  input: PromoInput
): Promise<PromoResult> {
  const none: PromoResult = { discountedAmount: input.baseAmount, promoId: null };
  const code = input.code?.trim();
  if (!code) return none;

  const { data: promo } = await db
    .from("promo_codes")
    .select(
      "id, discount_type, discount_percent, discount_amount, is_active, max_uses, used_count, restricted_to_service"
    )
    .ilike("code", code)
    .maybeSingle();

  if (!promo || !promo.is_active) return none;
  if (promo.max_uses != null && Number(promo.used_count) >= Number(promo.max_uses))
    return none;
  if (
    promo.restricted_to_service &&
    promo.restricted_to_service !== input.serviceId
  )
    return none;

  if (input.userId) {
    const { data: redeemed } = await db
      .from("promo_code_redemptions")
      .select("id")
      .eq("promo_code_id", promo.id)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (redeemed) return none;
  }

  let discounted = input.baseAmount;
  if (promo.discount_type === "flat") {
    discounted = Math.max(0, input.baseAmount - Number(promo.discount_amount));
  } else if (promo.discount_type === "percent") {
    discounted = input.baseAmount * (1 - Number(promo.discount_percent) / 100);
  }

  return { discountedAmount: Number(discounted.toFixed(2)), promoId: promo.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/pricing/validatePromo.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pricing/validatePromo.ts lib/pricing/validatePromo.test.ts
git commit -m "feat: add server-side promo code validation"
```

---

## Task 6: Wire price authority into `checkout_sessions`

**Files:**
- Modify: `app/api/checkout_sessions/route.ts`

- [ ] **Step 1: Replace client-price line items with computed amounts**

Replace the body of `POST` (lines 5–155) so that line items are built from `computeBookingAmount`, not `body.servicePackagePrice` / `body.addOns[].price` / `body.totalPrice`. New file content:

```ts
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureVehicle } from "@/utils/vehicle";
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { validatePromo } from "@/lib/pricing/validatePromo";
import { apiError } from "@/lib/http/apiError";
import { logger } from "@/lib/log/logger";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const servicePackageId: string = body.servicePackageId ?? body.spid ?? "";
    const addOnIds: string[] = Array.isArray(body.addOns)
      ? body.addOns.map((a: any) => a.id).filter(Boolean)
      : [];

    // Authoritative price — client values are ignored.
    const priced = await computeBookingAmount(admin, {
      servicePackageId,
      addOnIds,
      userId: user?.id ?? null,
      isAuthenticated: !!user,
      paymentMethod: "card",
    });

    // Server-side promo validation (client-sent discounts are ignored).
    const promo = await validatePromo(admin, {
      code: body.promoCode ?? "",
      baseAmount: priced.amount,
      userId: user?.id ?? null,
      serviceId: servicePackageId,
    });
    // Distribute the validated discount proportionally across line items.
    const discountFactor =
      priced.amount > 0 ? promo.discountedAmount / priced.amount : 1;

    // Resolve names from DB for Stripe line-item labels.
    const { data: service } = await admin
      .from("service_packages")
      .select("name")
      .eq("id", servicePackageId)
      .maybeSingle();
    const { data: addOnRows } = addOnIds.length
      ? await admin.from("add_ons").select("id, name, price").in("id", addOnIds)
      : { data: [] as any[] };

    const lineItems = [
      {
        price_data: {
          currency: "usd",
          product_data: { name: service?.name ?? "Car Wash Service" },
          unit_amount: Math.round(priced.servicePrice * 100 * discountFactor),
        },
        quantity: 1,
      },
      ...(addOnRows ?? []).map((a: any) => ({
        price_data: {
          currency: "usd",
          product_data: { name: a.name },
          unit_amount: Math.round(Number(a.price) * 100 * discountFactor),
        },
        quantity: 1,
      })),
    ];

    const passedVehicleId = body.vehicleSpecs?.vehicle_id || null;
    const vehicleId = passedVehicleId
      ? passedVehicleId
      : body.vehicleSpecs
        ? await ensureVehicle({ license_plate: body.vehicleSpecs.license_plate })
        : null;

    const bookingData = {
      uid: user?.id ?? null,
      vid: vehicleId ?? null,
      spid: servicePackageId,
      spn: service?.name ?? "",
      spp: priced.servicePrice,
      aids: addOnIds.join(","),
      ad: body.appointmentDate ?? "",
      at: body.appointmentTime ?? "",
      tp: promo.discountedAmount,
      td: body.totalDuration ?? 0,
      em: user?.email ?? body.customerEmail ?? "",
      nm: user?.user_metadata?.full_name ?? body.customerName ?? "",
      ph: body.customerPhone ?? "",
      si: body.specialInstructions ?? "",
    };

    const bookingJson = JSON.stringify(bookingData);
    if (bookingJson.length > 500) {
      logger.error("Booking metadata too large:", bookingJson.length);
      return apiError(new Error("metadata too large"));
    }

    const currentParams = new URLSearchParams({
      license_plate: body.vehicleSpecs?.license_plate || "",
      vehicle_id: vehicleId ?? "",
      service: servicePackageId,
      addons: addOnIds.join(","),
      date: body.appointmentDate || "",
      time: body.appointmentTime || "",
    }).toString();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: user?.email ?? body.customerEmail ?? undefined,
      success_url: user?.id
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/bookings/success?session_id={CHECKOUT_SESSION_ID}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: user?.id
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/booking/confirmation?${currentParams}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/confirmation?${currentParams}`,
      metadata: { booking: bookingJson },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors in `checkout_sessions/route.ts`.

- [ ] **Step 3: Manual verification (record result)**

With the dev server running, attempt a card booking from the dashboard confirmation page using browser devtools to tamper the request body (set `servicePackagePrice: 0`, `addOns[].price: 0`). Confirm the created Stripe session still charges the DB price. Note the observed Stripe amount in the commit message.

- [ ] **Step 4: Commit**

```bash
git add app/api/checkout_sessions/route.ts
git commit -m "fix: compute booking checkout price server-side, ignore client prices"
```

---

## Task 6b: Harden the `createBooking` server action (cash & free paths)

Task 6 secured the card path. The **cash** and **free/subscription** paths call the `createBooking` server action directly with client-supplied `totalPrice`, `servicePackage.price`, and `payment_method`. This task makes the action recompute the price and enforce payment rules server-side for self-serve (non-walk-in) bookings.

**Files:**
- Modify: `app/(dashboard)/dashboard/booking/action.ts`

- [ ] **Step 1: Recompute price and enforce rules before insert**

In `createBooking`, after `targetUserId` is determined and before the `bookings` insert (line ~89), insert authoritative recomputation for the self-serve path (when `!subscriberId`; walk-ins are admin-initiated and keep current behavior):

First add a `promoCode?: string` field to the `CarData` type (top of the file) so the action can validate it.

```ts
import { computeBookingAmount } from "@/lib/pricing/computeBookingAmount";
import { validatePromo } from "@/lib/pricing/validatePromo";
import { createAdminClient } from "@/utils/supabase/admin";
import { ApiError } from "@/lib/http/apiError";
```
```ts
let authoritativeTotal = car.totalPrice ?? 0;
let authoritativeServicePrice = car.servicePackage?.price ?? 0;

if (!subscriberId) {
  // Self-serve booking: never trust client prices or payment method.
  const admin = createAdminClient();
  const isAuthenticated = !!currentUser;
  const priced = await computeBookingAmount(admin, {
    servicePackageId: car.servicePackage?.id ?? "",
    addOnIds: car.addOnsId ?? [],
    userId: currentUser?.id ?? null,
    isAuthenticated,
    paymentMethod: car.payment_method as "card" | "cash" | "subscription",
  });

  // Guests cannot pay cash; "subscription" requires an actually-free result.
  if (car.payment_method === "cash" && !isAuthenticated) {
    throw new ApiError("Cash payment requires an account", 400);
  }
  if (car.payment_method === "subscription" && !priced.isFree) {
    throw new ApiError("No active subscription covers this service", 400);
  }

  // Apply promo server-side (ignored if invalid).
  const promo = await validatePromo(admin, {
    code: car.promoCode ?? "",
    baseAmount: priced.amount,
    userId: currentUser?.id ?? null,
    serviceId: car.servicePackage?.id ?? "",
  });

  authoritativeServicePrice = priced.servicePrice;
  authoritativeTotal = promo.discountedAmount;
}
```

- [ ] **Step 2: Use the authoritative values in the insert**

In the `bookings` insert object, change:
- `service_package_price: car.servicePackage?.price,` → `service_package_price: authoritativeServicePrice,`
- `total_price: car.totalPrice,` → `total_price: authoritativeTotal,`

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

From the dashboard confirmation page, tamper the server-action arguments (React devtools / network) to send `totalPrice: 0` and `payment_method: "cash"` while logged out as a guest flow. Expected: booking is rejected (guest+cash) and, when authenticated without a covering subscription, the stored `total_price` equals the DB-computed amount, not 0. Record results.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/booking/action.ts"
git commit -m "fix: enforce server-side price and payment rules in createBooking"
```

---

## Task 6c: Pass the promo code from the client to the server

The server now validates promos, so the client must send the **raw promo code string** (not a precomputed discount). Both confirmation pages enter the code as `promoCode` state.

**Files:**
- Modify: `app/(dashboard)/dashboard/booking/confirmation/page.tsx`
- Modify: `app/(user)/(booking)/confirmation/page.tsx`

- [ ] **Step 1: Send `promoCode` to the card checkout call**

In each confirmation page, in the card-payment branch that POSTs to `/api/checkout_sessions`, add `promoCode` to the JSON payload:
```ts
body: JSON.stringify({ ...payload, promoCode }),
```
(where `promoCode` is the existing state holding the entered code).

- [ ] **Step 2: Send `promoCode` to the `createBooking` cash/free call**

In the same pages, add `promoCode` to each `createBooking({ ... })` argument object:
```ts
promoCode,
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Apply a known-valid promo and complete a card booking and a cash booking. Confirm the Stripe amount and the stored `total_price` reflect the discount. Apply a fake/inactive code and confirm full price is charged. Record results.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/booking/confirmation/page.tsx" "app/(user)/(booking)/confirmation/page.tsx"
git commit -m "fix: send raw promo code to server for validation"
```

> **Follow-up (Phase 2):** move `recordPromoRedemption` to the server so redemptions can't be skipped by a tampered client. Out of scope for Phase 1.

---

## Task 7: Add auth guards to unprotected routes

**Files:**
- Modify: `app/api/broadcast/route.ts`
- Modify: `app/api/create-walkin-checkout/route.ts`
- Modify: `app/api/create-booking-checkout/route.ts`

- [ ] **Step 1: Protect `broadcast` (admin-only)**

At the top of the `POST` try-block in `app/api/broadcast/route.ts`, before `const admin = createAdminClient();`, insert:

```ts
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
```
and inside `POST`:
```ts
const supabase = await createClient();
const admin = createAdminClient();
await requireAdmin(supabase, admin); // throws 401/403
```
Replace the existing `catch (err)` body with `return apiError(err);`.

- [ ] **Step 2: Protect `create-walkin-checkout` (admin-only)**

In `app/api/create-walkin-checkout/route.ts`, add imports and guard at the top of `POST`:
```ts
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
```
```ts
const supabase = await createClient();
await requireAdmin(supabase, createAdminClient());
```
Replace `catch (error: any) { ... }` with `catch (err) { return apiError(err); }`.

- [ ] **Step 3: Protect `create-booking-checkout` (authenticated)**

This admin "new booking" route must at minimum require an authenticated admin (it posts to `/admin/booking`). Add the same `requireAdmin` guard as Step 2 at the top of `POST`, and replace the catch with `return apiError(err)`.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification**

With the dev server running, call each route while logged out (e.g. `curl -X POST http://localhost:3000/api/broadcast -d '{}' -H 'Content-Type: application/json'`). Expected: HTTP 401. Logged in as a non-admin: 403.

- [ ] **Step 6: Commit**

```bash
git add app/api/broadcast/route.ts app/api/create-walkin-checkout/route.ts app/api/create-booking-checkout/route.ts
git commit -m "fix: require admin auth on broadcast and walk-in/booking checkout routes"
```

> **Note:** `create-walkin-checkout` and `create-booking-checkout` still accept a client `amount`. Because they are now admin-only, the fraud surface is closed, but a follow-up (Phase 2) should route them through `computeBookingAmount` too. Record this as a known limitation in the commit body.

---

## Task 8: Fix `invite-admin` (role model + password)

**Files:**
- Modify: `app/api/invite-admin/route.ts`

- [ ] **Step 1: Use `requireAdmin`, drop `user_type`, generate a random password**

Replace the whole file with:

```ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabase/invadmin";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError } from "@/lib/http/apiError";
import { randomBytes } from "node:crypto";

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient();
    await requireAdmin(supabase, createAdminClient());

    const { email, full_name } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Create the user WITHOUT a known password; require them to set it via reset.
    const tempPassword = randomBytes(24).toString("base64url");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await supabaseAdmin.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name,
        role: "admin",
        created_at: new Date().toISOString(),
      });
    }

    // Send a password-reset link so the invited admin sets their own password.
    await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    return NextResponse.json({
      success: true,
      message: "Admin invited; password setup email sent",
    });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Invite a test admin from the admin UI. Confirm: (a) the new account has `role: 'admin'`, (b) no hardcoded password works, (c) a reset email arrives. Record results.

- [ ] **Step 4: Commit**

```bash
git add app/api/invite-admin/route.ts
git commit -m "fix: invite-admin uses role model, random password, reset email"
```

---

## Task 9: Apply email escaping to email routes

**Files:**
- Modify: `app/api/admin/send-direct-email/route.ts`
- Modify: `app/api/broadcast/route.ts`

- [ ] **Step 1: Escape dynamic content in `send-direct-email`**

In `buildEmailHtml` (`app/api/admin/send-direct-email/route.ts`), import and apply escaping:
```ts
import { escapeHtml, isAllowedBannerUrl } from "@/lib/email/escapeHtml";
```
- Wrap `${subject}` in `<title>` as `${escapeHtml(subject)}`.
- Wrap `${title}` (the `<h1>`) as `${escapeHtml(title)}`.
- In `paragraphs`, escape each line: change `${trimmed}` interpolations to `${escapeHtml(trimmed)}`.
- Replace the `bannerUrl ? ... : ""` block condition with `isAllowedBannerUrl(bannerUrl) ? ... : ""`, and escape the `src`: `src="${escapeHtml(bannerUrl)}"`.

- [ ] **Step 2: Escape dynamic content in `broadcast`**

Apply the same: `import { escapeHtml, isAllowedBannerUrl } from "@/lib/email/escapeHtml";` and escape `subject`, `title`, each `body` paragraph, and guard `bannerUrl` with `isAllowedBannerUrl`.

- [ ] **Step 3: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add app/api/admin/send-direct-email/route.ts app/api/broadcast/route.ts
git commit -m "fix: escape user content and allowlist banner URLs in emails"
```

---

## Task 10: Stripe webhook idempotency

**Files:**
- Create: `supabase/migrations/<timestamp>_stripe_event_idempotency.sql`
- Modify: `app/api/webhook/route.ts`

- [ ] **Step 1: Create the idempotency table migration**

Create `supabase/migrations/20260611000000_stripe_event_idempotency.sql` (use current UTC timestamp for the filename):

```sql
create table if not exists public.processed_stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
-- No policies: only the service-role key (webhook) may read/write, which bypasses RLS.
```

- [ ] **Step 2: Apply the migration**

Run the SQL in Supabase Dashboard → SQL Editor (the local `supabase db push` is blocked by the Docker image issue noted in the spec). Confirm the table exists:
```sql
select count(*) from public.processed_stripe_events;
```
Expected: returns `0`.

- [ ] **Step 3: Add the idempotency check to the webhook**

In `app/api/webhook/route.ts`, immediately after `event` is constructed (after line 36, before the `switch`), insert:

```ts
// Idempotency: skip events Stripe has already delivered.
const { data: already } = await supabase
  .from("processed_stripe_events")
  .select("id")
  .eq("id", event.id)
  .maybeSingle();
if (already) {
  return NextResponse.json({ received: true, duplicate: true });
}
```

And immediately before the final successful `return` of the `POST` handler (after the `switch` completes), insert:
```ts
await supabase
  .from("processed_stripe_events")
  .insert({ id: event.id, type: event.type });
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Use the Stripe CLI to resend a test event twice:
```bash
stripe trigger checkout.session.completed
```
Confirm the second delivery returns `{ "duplicate": true }` and no second booking is created. Record result.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/ app/api/webhook/route.ts
git commit -m "fix: make Stripe webhook idempotent via processed_stripe_events"
```

---

## Task 11: Pin Stripe API version

**Files:**
- Modify: `lib/stripe/stripe.ts`

- [ ] **Step 1: Read the current client**

Run: `cat lib/stripe/stripe.ts` to confirm the export name and shape.

- [ ] **Step 2: Add `apiVersion`**

Set the Stripe constructor options to pin the version, e.g.:
```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});
```
Use the `apiVersion` string the installed `stripe` package's types expect (hover/Type error will show the accepted literal; match it exactly).

- [ ] **Step 3: Type-check and commit**

Run: `npx tsc --noEmit`
Expected: no errors.
```bash
git add lib/stripe/stripe.ts
git commit -m "chore: pin Stripe API version"
```

---

## Task 12: RLS policy review

**Files:**
- Create: `supabase/migrations/<timestamp>_rls_review.sql` (only if gaps are found)

- [ ] **Step 1: Export current policies**

Run in Supabase Dashboard → SQL Editor and paste the result back into the working session:
```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' order by tablename;
select relname, relrowsecurity
from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r';
```

- [ ] **Step 2: Verify each business rule has a backing policy**

Check, table by table, against the spec's business rules:
- `bookings`: guests may INSERT but only SELECT their own; no client UPDATE of `status`/`total_price`.
- `vehicles`: owner-only read/update; admin via service role.
- `profiles`: a user may read/update only their own row; `role` not self-writable.
- `user_subscription` / `self_service_subscriptions`: owner-only read.
- `promo_codes`: read-only to clients; redemptions insert-only.
- All money tables: no anon write paths.

Record any table where RLS is disabled (`relrowsecurity = false`) or a rule is unbacked.

- [ ] **Step 3: Write corrective migration (only if gaps found)**

For each gap, add a policy in `supabase/migrations/<timestamp>_rls_review.sql`. Example pattern for owner-only select:
```sql
alter table public.bookings enable row level security;
create policy "bookings_select_own" on public.bookings
  for select using (auth.uid() = user_id);
```
Apply via Dashboard SQL Editor, then commit the migration file.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "fix: close RLS gaps found in Phase 1 review"
```

---

## Final verification

- [ ] Run the full unit suite: `npm test` — all tests pass.
- [ ] Run `npx tsc --noEmit` — no type errors introduced.
- [ ] Confirm each manual-verification result was recorded in its task commit.
- [ ] Update `docs/superpowers/specs/2026-06-11-phase-1-security-design.md` status to "Implemented" and note the RLS findings.
