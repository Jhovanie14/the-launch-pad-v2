# Self-Service Subscription Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let self-service subscribers cancel from `/dashboard/billing` (effective at period end), and fix the webhook so `self_service_subscriptions` actually tracks Stripe updates/deletions.

**Architecture:** A new testable sync helper in `lib/subscriptions/` gives the webhook's `customer.subscription.updated/deleted` handlers a fall-through: express (`user_subscription`) first, self-service second. The existing-but-unused cancel route gets house conventions plus an immediate DB stamp. The billing card gains a destructive cancel button + AlertDialog and a pending-cancellation notice, mirroring the express "Unsubscribe Everything" pattern.

**Tech Stack:** Next.js App Router, Supabase, Stripe subscriptions, shadcn/ui AlertDialog, sonner, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-12-self-service-cancel-design.md`.

## Global Constraints

- Cancellation is **at period end** (`cancel_at_period_end: true`) — never immediate, never refunded.
- **Express behavior must be bit-for-bit unchanged**: same update payloads, same emails, same `subscription_vehicles` metadata block. The helper wraps the existing express queries; it does not redesign them.
- Vitest only includes `lib/**/*.test.ts`; Supabase is mocked as a hand-rolled fake passed as an argument (never `vi.mock`). Run with `npm test`.
- New UI feedback uses sonner `toast`; leave the component's existing `alert()` calls (payment-method path) alone.
- Server-side writes to `self_service_subscriptions` use the service-role client (`createAdminClient`); there are no client-side write policies on that table.
- Toast copy on successful cancel (matches express verbatim): `"Your subscription will be canceled at the end of the billing period."`
- Commit messages: conventional prefixes. **No Co-Authored-By trailer.**
- Work on a feature branch (e.g. `self-service-cancel`) per the executing skill's workspace step.

## File Structure

**Create:**
- `lib/subscriptions/syncStripeSubscription.ts` — dual-table subscription sync + cancel-just-scheduled predicate
- `lib/subscriptions/syncStripeSubscription.test.ts`

**Modify:**
- `app/api/webhook/route.ts:948-1091` — `handleSubscriptionUpdated` + `handleSubscriptionDeleted` rewired onto the helper
- `app/api/cancel-self-service-subscription/route.ts` — house conventions + DB stamp (full rewrite, 54 lines)
- `hooks/useSelfServiceSubscription.ts:47` — expose `reload`
- `components/self-service-subscription-status.tsx` — prop, dialog, notice, button
- `app/(dashboard)/dashboard/billing/page.tsx:16,75` — thread `reload` through

No DB migration: `self_service_subscriptions.cancel_at_period_end` already exists and is written at checkout (`processSelfServiceSubscription`, webhook line ~922). `lib/services/selfServiceSubscriptionService.ts` uses `select("*")`, so the flag already reaches the UI type (`SelfServiceSubscription.cancel_at_period_end`, `types/index.ts:123`).

---

### Task 1: Sync helper (`lib/subscriptions/syncStripeSubscription.ts`)

**Files:**
- Create: `lib/subscriptions/syncStripeSubscription.ts`
- Test: `lib/subscriptions/syncStripeSubscription.test.ts`

**Interfaces:**
- Produces:
  - `StripeSubscriptionUpdateFields { stripeSubscriptionId: string; status: string; currentPeriodStartIso: string; currentPeriodEndIso: string | null; cancelAtPeriodEnd: boolean; priceId: string | null; metadataPlanId: string | null; metadataBillingCycle: string | null }`
  - `SubscriptionSyncResult { table: "user_subscription" | "self_service_subscriptions" | null; userId: string | null; rowId: string | null }`
  - `applySubscriptionUpdate(db, fields): Promise<SubscriptionSyncResult>` — express arm replicates the CURRENT webhook queries exactly (existing-row read → plan/billing-cycle fallback → update); if zero express rows matched, updates `self_service_subscriptions` (status, periods, cancel flag only).
  - `applySubscriptionDeleted(db, stripeSubscriptionId): Promise<SubscriptionSyncResult>` — same fall-through with `{ status: "canceled", cancel_at_period_end: false }`.
  - `wasCancelJustScheduled(prevAttrs: Record<string, unknown>, cancelAtPeriodEnd: boolean): boolean` — extracted verbatim from the webhook's current detection.
- `db` is a `SupabaseClient` passed in (service-role in production, fake in tests).

- [ ] **Step 1: Write the failing tests**

Create `lib/subscriptions/syncStripeSubscription.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applySubscriptionDeleted,
  applySubscriptionUpdate,
  wasCancelJustScheduled,
} from "./syncStripeSubscription";

const FIELDS = {
  stripeSubscriptionId: "sub_123",
  status: "active",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: true,
  priceId: "price_1",
  metadataPlanId: null,
  metadataBillingCycle: "monthly",
};

/**
 * Fake Supabase. `express` / `self` control whether each table's update
 * matches a row. Records every update payload per table.
 */
function fakeDb(opts: {
  express?: { id: string; user_id: string } | null;
  self?: { id: string; user_id: string } | null;
  existingPlan?: { subscription_plan_id: string | null; billing_cycle: string | null } | null;
}) {
  const updates: Record<string, any[]> = {
    user_subscription: [],
    self_service_subscriptions: [],
  };
  const db = {
    from(table: string) {
      if (table === "user_subscription") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: opts.existingPlan ?? null,
                error: null,
              }),
            }),
          }),
          update: (values: any) => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => {
                  updates.user_subscription.push(values);
                  return { data: opts.express ?? null, error: null };
                },
              }),
            }),
          }),
        };
      }
      if (table === "self_service_subscriptions") {
        return {
          update: (values: any) => ({
            eq: () => ({
              select: () => ({
                maybeSingle: async () => {
                  updates.self_service_subscriptions.push(values);
                  return { data: opts.self ?? null, error: null };
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as any;
  return { db, updates };
}

describe("applySubscriptionUpdate", () => {
  it("updates the express row and never touches self-service", async () => {
    const { db, updates } = fakeDb({
      express: { id: "row-1", user_id: "user-1" },
      existingPlan: { subscription_plan_id: "plan-9", billing_cycle: "year" },
    });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({
      table: "user_subscription",
      userId: "user-1",
      rowId: "row-1",
    });
    expect(updates.self_service_subscriptions).toHaveLength(0);
    // express payload keeps the full field set, with metadata fallbacks applied
    expect(updates.user_subscription[0]).toEqual({
      status: "active",
      current_period_start: "2026-08-01T00:00:00.000Z",
      current_period_end: "2026-09-01T00:00:00.000Z",
      cancel_at_period_end: true,
      price_id: "price_1",
      billing_cycle: "month", // metadata "monthly" normalized
      subscription_plan_id: "plan-9", // fell back to existing row's plan
    });
  });

  it("falls through to self-service when no express row matches", async () => {
    const { db, updates } = fakeDb({
      express: null,
      self: { id: "ss-1", user_id: "user-2" },
    });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({
      table: "self_service_subscriptions",
      userId: "user-2",
      rowId: "ss-1",
    });
    // self-service payload is the slim set — no price/plan/billing columns
    expect(updates.self_service_subscriptions[0]).toEqual({
      status: "active",
      current_period_start: "2026-08-01T00:00:00.000Z",
      current_period_end: "2026-09-01T00:00:00.000Z",
      cancel_at_period_end: true,
    });
  });

  it("returns a null result when neither table matches", async () => {
    const { db } = fakeDb({ express: null, self: null });
    const result = await applySubscriptionUpdate(db, FIELDS);
    expect(result).toEqual({ table: null, userId: null, rowId: null });
  });

  it("keeps the existing billing cycle when metadata has none", async () => {
    const { db, updates } = fakeDb({
      express: { id: "row-1", user_id: "user-1" },
      existingPlan: { subscription_plan_id: "plan-9", billing_cycle: "year" },
    });
    await applySubscriptionUpdate(db, { ...FIELDS, metadataBillingCycle: null });
    expect(updates.user_subscription[0].billing_cycle).toBe("year");
  });
});

describe("applySubscriptionDeleted", () => {
  it("cancels the express row when it matches", async () => {
    const { db, updates } = fakeDb({ express: { id: "row-1", user_id: "user-1" } });
    const result = await applySubscriptionDeleted(db, "sub_123");
    expect(result.table).toBe("user_subscription");
    expect(result.userId).toBe("user-1");
    expect(updates.user_subscription[0]).toEqual({
      status: "canceled",
      cancel_at_period_end: false,
    });
    expect(updates.self_service_subscriptions).toHaveLength(0);
  });

  it("falls through and cancels the self-service row", async () => {
    const { db, updates } = fakeDb({
      express: null,
      self: { id: "ss-1", user_id: "user-2" },
    });
    const result = await applySubscriptionDeleted(db, "sub_123");
    expect(result.table).toBe("self_service_subscriptions");
    expect(result.userId).toBe("user-2");
    expect(updates.self_service_subscriptions[0]).toEqual({
      status: "canceled",
      cancel_at_period_end: false,
    });
  });

  it("returns null result when neither matches", async () => {
    const { db } = fakeDb({ express: null, self: null });
    expect(await applySubscriptionDeleted(db, "sub_x")).toEqual({
      table: null,
      userId: null,
      rowId: null,
    });
  });
});

describe("wasCancelJustScheduled", () => {
  it("is true only when previous_attributes shows false -> true", () => {
    expect(wasCancelJustScheduled({ cancel_at_period_end: false }, true)).toBe(true);
    expect(wasCancelJustScheduled({ cancel_at_period_end: true }, true)).toBe(false);
    expect(wasCancelJustScheduled({}, true)).toBe(false);
    expect(wasCancelJustScheduled({ cancel_at_period_end: false }, false)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/subscriptions/syncStripeSubscription.test.ts`
Expected: FAIL — cannot resolve `./syncStripeSubscription`.

- [ ] **Step 3: Implement `lib/subscriptions/syncStripeSubscription.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Dual-table Stripe subscription sync. The webhook's subscription events
 * carry no marker for which product they belong to, so we try the express
 * table (user_subscription) first and fall through to
 * self_service_subscriptions when no row matched. Express queries replicate
 * the webhook's original behavior exactly.
 */

export interface StripeSubscriptionUpdateFields {
  stripeSubscriptionId: string;
  status: string;
  currentPeriodStartIso: string;
  currentPeriodEndIso: string | null;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  /** subscription.metadata.plan_id (express checkout sets it) */
  metadataPlanId: string | null;
  /** subscription.metadata.billing_cycle — raw "monthly" | "yearly" | null */
  metadataBillingCycle: string | null;
}

export interface SubscriptionSyncResult {
  table: "user_subscription" | "self_service_subscriptions" | null;
  userId: string | null;
  rowId: string | null;
}

const NO_MATCH: SubscriptionSyncResult = { table: null, userId: null, rowId: null };

export async function applySubscriptionUpdate(
  db: SupabaseClient,
  f: StripeSubscriptionUpdateFields,
): Promise<SubscriptionSyncResult> {
  // Express arm — replicates the original handleSubscriptionUpdated queries.
  const { data: existingSub } = await db
    .from("user_subscription")
    .select("subscription_plan_id, billing_cycle")
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .maybeSingle();

  const planId = f.metadataPlanId ?? existingSub?.subscription_plan_id ?? null;
  const billingCycle =
    f.metadataBillingCycle === "monthly"
      ? "month"
      : f.metadataBillingCycle === "yearly"
        ? "year"
        : (existingSub?.billing_cycle ?? null);

  const { data: expressRow, error: expressError } = await db
    .from("user_subscription")
    .update({
      status: f.status,
      current_period_start: f.currentPeriodStartIso,
      current_period_end: f.currentPeriodEndIso,
      cancel_at_period_end: f.cancelAtPeriodEnd,
      price_id: f.priceId,
      billing_cycle: billingCycle,
      subscription_plan_id: planId,
    })
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (expressError) {
    console.error("Error updating subscription:", expressError);
    return NO_MATCH;
  }
  if (expressRow) {
    return { table: "user_subscription", userId: expressRow.user_id, rowId: expressRow.id };
  }

  // Self-service arm — slim column set; plan/price/billing live elsewhere.
  const { data: selfRow, error: selfError } = await db
    .from("self_service_subscriptions")
    .update({
      status: f.status,
      current_period_start: f.currentPeriodStartIso,
      current_period_end: f.currentPeriodEndIso,
      cancel_at_period_end: f.cancelAtPeriodEnd,
    })
    .eq("stripe_subscription_id", f.stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (selfError) {
    console.error("Error updating self-service subscription:", selfError);
    return NO_MATCH;
  }
  if (selfRow) {
    return {
      table: "self_service_subscriptions",
      userId: selfRow.user_id,
      rowId: selfRow.id,
    };
  }
  return NO_MATCH;
}

export async function applySubscriptionDeleted(
  db: SupabaseClient,
  stripeSubscriptionId: string,
): Promise<SubscriptionSyncResult> {
  const cancelled = { status: "canceled", cancel_at_period_end: false };

  const { data: expressRow, error: expressError } = await db
    .from("user_subscription")
    .update(cancelled)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (expressError) {
    console.error("Error canceling subscription:", expressError);
    return NO_MATCH;
  }
  if (expressRow) {
    return { table: "user_subscription", userId: expressRow.user_id, rowId: expressRow.id };
  }

  const { data: selfRow, error: selfError } = await db
    .from("self_service_subscriptions")
    .update(cancelled)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .select("id, user_id")
    .maybeSingle();

  if (selfError) {
    console.error("Error canceling self-service subscription:", selfError);
    return NO_MATCH;
  }
  if (selfRow) {
    return {
      table: "self_service_subscriptions",
      userId: selfRow.user_id,
      rowId: selfRow.id,
    };
  }
  return NO_MATCH;
}

/** True when Stripe's previous_attributes shows cancel_at_period_end flipping
 * false -> true on this event (the moment a cancellation is scheduled). */
export function wasCancelJustScheduled(
  prevAttrs: Record<string, unknown>,
  cancelAtPeriodEnd: boolean,
): boolean {
  return (
    "cancel_at_period_end" in prevAttrs &&
    prevAttrs.cancel_at_period_end === false &&
    cancelAtPeriodEnd === true
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/subscriptions/syncStripeSubscription.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/subscriptions/
git commit -m "feat(subscriptions): dual-table Stripe subscription sync helper"
```

---

### Task 2: Rewire the webhook handlers

**Files:**
- Modify: `app/api/webhook/route.ts` — imports + full replacement of `handleSubscriptionUpdated` (lines ~948-1058) and `handleSubscriptionDeleted` (lines ~1060-1091)

**Interfaces:**
- Consumes: `applySubscriptionUpdate`, `applySubscriptionDeleted`, `wasCancelJustScheduled` from `@/lib/subscriptions/syncStripeSubscription` (Task 1); existing `sendCancellationScheduledEmail`, `sendSubscriptionCancelledEmail` imports and the module-level `supabase` service client.
- Produces: self-service rows now track status/periods/cancel flag; cancellation emails fire for whichever table matched. Express behavior unchanged (same payloads via the helper, same emails, same vehicle-link block gated to `table === "user_subscription"`).

- [ ] **Step 1: Add the import**

At the top of `app/api/webhook/route.ts`, next to the other `@/lib` imports:

```ts
import {
  applySubscriptionDeleted,
  applySubscriptionUpdate,
  wasCancelJustScheduled,
} from "@/lib/subscriptions/syncStripeSubscription";
```

- [ ] **Step 2: Replace `handleSubscriptionUpdated` entirely**

Replace the whole function (from `async function handleSubscriptionUpdated(event: Stripe.Event) {` through its closing brace, currently ending right before `async function handleSubscriptionDeleted`) with:

```ts
async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  const subscriptionItem = subscription.items.data[0] as Stripe.SubscriptionItem | undefined;

  const cps = Number(subscriptionItem?.current_period_start);
  const cpe = Number(subscriptionItem?.current_period_end);

  const currentPeriodStartIso = Number.isFinite(cps)
    ? new Date(cps * 1000).toISOString()
    : new Date().toISOString();
  const currentPeriodEndIso = Number.isFinite(cpe)
    ? new Date(cpe * 1000).toISOString()
    : null;

  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);

  // Express first, self-service fall-through (see lib/subscriptions).
  const result = await applySubscriptionUpdate(supabase, {
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStartIso,
    currentPeriodEndIso,
    cancelAtPeriodEnd,
    priceId: subscriptionItem?.price?.id ?? null,
    metadataPlanId: subscription.metadata?.plan_id ?? null,
    metadataBillingCycle: subscription.metadata?.billing_cycle || null,
  });

  if (!result.table) return;

  // Send retention email when cancel_at_period_end is newly set to true.
  // Stripe's PreviousAttributes is typed as an empty interface; cast to a
  // record so we can safely read the dynamic field we know may be present.
  const prevAttrs = (event.data.previous_attributes ?? {}) as Record<string, unknown>;

  if (wasCancelJustScheduled(prevAttrs, cancelAtPeriodEnd) && result.userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", result.userId)
      .maybeSingle();

    if (profile?.email && currentPeriodEndIso) {
      const endDate = new Date(currentPeriodEndIso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      await sendCancellationScheduledEmail({
        to: profile.email,
        name: profile.full_name ?? "there",
        periodEndDate: endDate,
      });
    }
  }

  // Update subscription_vehicles if vehicle_id exists — express-only concern.
  const vehicleId = subscription.metadata?.vehicle_id ?? null;
  if (result.table === "user_subscription" && vehicleId && result.rowId) {
    const { data: existingLink } = await supabase
      .from("subscription_vehicles")
      .select("id, vehicle_id")
      .eq("subscription_id", result.rowId)
      .maybeSingle();

    if (existingLink) {
      // Update existing link
      await supabase
        .from("subscription_vehicles")
        .update({ vehicle_id: vehicleId })
        .eq("subscription_id", result.rowId);
    } else {
      // Insert new link. This handler only runs for single-vehicle
      // subscriptions (vehicle_id comes from subscription metadata, not a
      // multi-vehicle array), so a freshly-inserted link is always primary.
      await supabase.from("subscription_vehicles").insert({
        subscription_id: result.rowId,
        vehicle_id: vehicleId,
        is_primary: true,
      });
    }
  }
}
```

- [ ] **Step 3: Replace `handleSubscriptionDeleted` entirely**

```ts
async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log("Subscription deleted:", subscription.id);

  const result = await applySubscriptionDeleted(supabase, subscription.id);
  if (!result.userId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", result.userId)
    .maybeSingle();

  if (!profile?.email) return;

  await sendSubscriptionCancelledEmail({
    to: profile.email,
    name: profile.full_name ?? "there",
  });
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -iE "webhook|syncStripe"` — expected: nothing.
Run: `npm test` — expected: all green.
Run: `npx eslint app/api/webhook/route.ts` — expected: no NEW errors (one pre-existing `prefer-const` on `userId` in `processNewBooking` is not ours).

- [ ] **Step 5: Commit**

```bash
git add app/api/webhook/route.ts
git commit -m "fix(webhook): sync self-service subscriptions on update/delete events"
```

---

### Task 3: Harden the cancel route

**Files:**
- Modify: `app/api/cancel-self-service-subscription/route.ts` (full rewrite — it's 54 lines)

**Interfaces:**
- Consumes: `requireUser` (`@/lib/auth/guards`), `apiError`/`ApiError` (`@/lib/http/apiError`), `stripe` (`@/lib/stripe/stripe`), `createClient` (`@/utils/supabase/server`), `createAdminClient` (`@/utils/supabase/admin`).
- Produces: `POST /api/cancel-self-service-subscription` → `{ canceled: true }` on success; errors 401 (unauthenticated), 404 (no active sub), 400 (no linked Stripe sub), 500 (Stripe failure) as `{ error }`. Also stamps `cancel_at_period_end: true` on the DB row.

- [ ] **Step 1: Rewrite the route**

Replace the entire file content with:

```ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";

export async function POST() {
  try {
    const supabase = await createClient();
    const user = await requireUser(supabase);

    // Get the user's active self-service subscription (own-row RLS read).
    const { data: subscription } = await supabase
      .from("self_service_subscriptions")
      .select("id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      throw new ApiError("No active self-service subscription", 404);
    }
    if (!subscription.stripe_subscription_id) {
      throw new ApiError("No Stripe subscription linked", 400);
    }

    // Cancel at period end — never immediate, never refunded.
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Stamp the row now so the UI's immediate refetch is deterministic; the
    // webhook (customer.subscription.updated) confirms the same value. If the
    // stamp fails, the webhook will still correct it — log, don't fail.
    const admin = createAdminClient();
    const { error: stampError } = await admin
      .from("self_service_subscriptions")
      .update({ cancel_at_period_end: true })
      .eq("id", subscription.id);
    if (stampError) {
      console.error(
        "[cancel-self-service] Stripe cancel scheduled but DB stamp failed:",
        stampError,
      );
    }

    return NextResponse.json({ canceled: true });
  } catch (err) {
    return apiError(err);
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "cancel-self-service"` — expected: nothing.
Run: `npx eslint app/api/cancel-self-service-subscription/route.ts` — expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/api/cancel-self-service-subscription/route.ts
git commit -m "feat(subscription): harden self-service cancel route and stamp cancel flag"
```

---

### Task 4: Cancel UI — hook, card, billing page

**Files:**
- Modify: `hooks/useSelfServiceSubscription.ts:47` (return statement)
- Modify: `components/self-service-subscription-status.tsx` (imports, props, state, handler, JSX after the Update Payment Method block)
- Modify: `app/(dashboard)/dashboard/billing/page.tsx:16` (destructure) and `:75` (prop)

**Interfaces:**
- Consumes: `POST /api/cancel-self-service-subscription` (Task 3); `subscription.cancel_at_period_end` (already in `SelfServiceSubscription`, flows through the service's `select("*")`).
- Produces: `useSelfServiceSubscription()` additionally returns `reload: () => Promise<void>`; `SelfServiceSubscriptionStatus` accepts optional `onSubscriptionChange?: () => void`.

- [ ] **Step 1: Expose `reload` from the hook**

In `hooks/useSelfServiceSubscription.ts`, change the return statement (line 47):

```ts
  return { subscription, loading, error, reload: loadSubscription };
```

- [ ] **Step 2: Update the component — imports, props, state, handler**

In `components/self-service-subscription-status.tsx`:

**(a)** Replace the top imports block (lines 1-3) with:

```tsx
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { SelfServiceSubscription } from "@/types";
```

**(b)** Extend the props interface and destructuring:

```tsx
interface SelfServiceSubscriptionStatusProps {
  subscription: SelfServiceSubscription | null;
  onSubscriptionChange?: () => void;
}

export default function SelfServiceSubscriptionStatus({
  subscription,
  onSubscriptionChange,
}: SelfServiceSubscriptionStatusProps) {
```

**(c)** Add state next to the existing `loading` state (line ~12):

```tsx
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
```

**(d)** Add the handler after `handleUpdatePayment` (after line ~33):

```tsx
  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await fetch("/api/cancel-self-service-subscription", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to cancel subscription");
      }
      toast.success(
        "Your subscription will be canceled at the end of the billing period.",
      );
      setCancelOpen(false);
      onSubscriptionChange?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    } finally {
      setCancelling(false);
    }
  };
```

- [ ] **Step 3: Update the component — JSX**

Immediately after the "Update Payment Method" block (the `<div className="mt-4">…</div>` wrapping that button, lines ~189-197), insert:

```tsx
        {subscription.cancel_at_period_end ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Cancellation scheduled — your access ends{" "}
            {formatDate(subscription.current_period_end)}.
          </div>
        ) : (
          subscription.status === "active" && (
            <div className="mt-4">
              <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                Cancel Subscription
              </Button>
            </div>
          )
        )}

        <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Cancel your self-service subscription?
              </AlertDialogTitle>
              <AlertDialogDescription>
                You&apos;ll keep access until{" "}
                {formatDate(subscription.current_period_end)}, then your
                subscription ends. No further charges.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                disabled={cancelling}
                onClick={(e) => {
                  e.preventDefault(); // keep the dialog open while in flight
                  handleCancelSubscription();
                }}
              >
                {cancelling ? "Cancelling…" : "Yes, Cancel Subscription"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
```

- [ ] **Step 4: Thread `reload` through the billing page**

In `app/(dashboard)/dashboard/billing/page.tsx`:

Line ~16, change:

```tsx
  const { subscription: selfSubs, reload: reloadSelfSubs } = useSelfServiceSubscription();
```

Line ~75, change:

```tsx
          <SelfServiceSubscriptionStatus
            subscription={selfSubs}
            onSubscriptionChange={reloadSelfSubs}
          />
```

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -iE "self-service-subscription-status|useSelfServiceSubscription|billing"` — expected: nothing.
Run: `npx eslint components/self-service-subscription-status.tsx hooks/useSelfServiceSubscription.ts "app/(dashboard)/dashboard/billing/page.tsx"` — expected: no new errors.
Run: `npm test` — expected: green.

- [ ] **Step 6: Commit**

```bash
git add hooks/useSelfServiceSubscription.ts components/self-service-subscription-status.tsx "app/(dashboard)/dashboard/billing/page.tsx"
git commit -m "feat(billing): self-service cancel button with pending-cancellation notice"
```

---

### Task 5: Manual end-to-end verification (Stripe test mode)

No file changes — the spec's manual checklist, run with `npm run dev` (+ `stripe listen --forward-to localhost:3000/api/webhook` if testing webhooks locally).

- [ ] **Step 1: Cancel from billing**

As a user with an active self-service subscription, open `/dashboard/billing`:
1. The card shows the destructive "Cancel Subscription" button (only when active and not already scheduled).
2. Click → dialog states access continues until the period end date → "Yes, Cancel Subscription".
3. Toast appears; the card flips to the amber "Cancellation scheduled — your access ends \<date\>." notice; the cancel button is gone; "Update Payment Method" remains.
4. In SQL Editor: `select status, cancel_at_period_end from self_service_subscriptions where user_id = '<uid>';` → `active`, `true`.
5. The cancellation-scheduled email arrives (webhook `customer.subscription.updated`).

- [ ] **Step 2: Simulate period end**

In the Stripe test dashboard, cancel that subscription **immediately** (simulates the period-end deletion):
1. Webhook `customer.subscription.deleted` fires → row flips to `status = 'canceled'`.
2. `/dashboard/billing` now shows the "no active self-service subscription" card.
3. The cancellation-completed email arrives.

- [ ] **Step 3: Express regression check**

Cancel an express subscription via "Unsubscribe Everything" — behavior identical to before (toast, scheduled email, `user_subscription.cancel_at_period_end = true`). Confirms the helper's express arm changed nothing.

- [ ] **Step 4: Error paths**

With no active self-service subscription, `POST /api/cancel-self-service-subscription` returns 404 `{ "error": "No active self-service subscription" }`; signed out it returns 401.

---

## Out of scope (from the spec — do not build)

Un-cancel/resume, immediate cancellation or prorated refunds, retention offers or cancel-reason surveys, Stripe portal configuration changes, unrelated express-subscription fixes.

