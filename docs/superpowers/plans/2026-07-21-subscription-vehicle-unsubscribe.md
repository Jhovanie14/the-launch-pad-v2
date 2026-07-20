# Subscription Vehicle Unsubscribe & Primary Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let customers precisely unsubscribe a single family vehicle, unsubscribe their primary vehicle (auto-swapping in a chosen family vehicle as the new full-price primary), or unsubscribe everything — each action confirmed via a shadcn dialog and followed by a Resend email — without ever leaving family vehicles billed at a discount with no primary anchoring the plan.

**Architecture:** Add an explicit `is_primary` column to `subscription_vehicles` (replacing the current fragile "primary = first row by insertion order" assumption) as the foundation. Layer a new API route for the primary-swap Stripe/DB transaction, three new Resend email templates wired synchronously into the existing add/remove routes and the new swap route, and three UI changes to `subscription-status.tsx`/`billing/page.tsx`: relabeled family-vehicle removal, a primary-vehicle unsubscribe control that branches to a new swap dialog or the full-cancel dialog, and a consolidated "Unsubscribe Everything" `AlertDialog` replacing the old native-`confirm()` button.

**Tech Stack:** Next.js App Router API routes, Supabase (Postgres + JS client), Stripe Node SDK, shadcn/ui (`Dialog`, `AlertDialog`, `Button`), Resend, sonner (toasts), vitest (existing test runner — scoped to `lib/**/*.test.ts` only, no route/component test harness exists in this repo).

## Global Constraints

- Follow the approved spec exactly: `docs/superpowers/specs/2026-07-21-subscription-vehicle-unsubscribe-design.md`.
- This repo has **no automated tests for API routes or React components** (`vitest.config.ts` only includes `lib/**/*.test.ts`, no React Testing Library is installed). Do not introduce new test infrastructure as a side effect of this feature — verify routes/components manually via the dev server, exactly as the existing `add-vehicle`/`remove-vehicle` routes and `subscription-status.tsx` are verified today.
- All new Stripe subscription-item mutations use `proration_behavior: "create_prorations"` (immediate + prorated), matching existing add/remove-vehicle behavior.
- All new DB writes to `subscription_vehicles` (delete, `is_primary` update) go through the **admin client** (`createAdminClient()` from `@/utils/supabase/admin`), matching the existing RLS-bypass pattern in `remove-vehicle/route.ts`.
- New email functions follow the existing `emailWrapper`/`BASE_STYLES` structure in `lib/email/subscription-emails.ts` — do not introduce a different email layout system.
- Never touch `app/api/admin/backfill-stripe-item-ids/route.ts` — it's a one-time admin tool unrelated to `is_primary` (out of scope, confirmed during design).

---

### Task 1: `is_primary` migration + generated types

**Files:**
- Create: `supabase/migrations/20260721000000_subscription_vehicles_is_primary.sql`
- Modify: `types/database.types.ts:929-968` (the `subscription_vehicles` table type block)

**Interfaces:**
- Produces: `subscription_vehicles.is_primary boolean not null default false` column, with a unique partial index guaranteeing at most one primary row per `subscription_id`. Produces TypeScript field `is_primary: boolean` on `Database["public"]["Tables"]["subscription_vehicles"]["Row" | "Insert" | "Update"]`.

- [ ] **Step 1: Write the migration file**

```sql
-- Add explicit is_primary tracking to subscription_vehicles.
--
-- Problem: "primary vehicle" was inferred everywhere as "the row with the
-- smallest id when ordered ascending" — fragile (id is a UUID, not
-- guaranteed to sort by insertion order) and unable to represent "the user
-- explicitly chose vehicle X as the new primary" (needed for the
-- primary-vehicle swap feature). This migration makes primary status
-- explicit and enforces exactly one primary per subscription.

alter table public.subscription_vehicles
  add column is_primary boolean not null default false;

-- Backfill: earliest vehicle per subscription (by created_at) becomes primary.
with ranked as (
  select id,
         row_number() over (partition by subscription_id order by created_at asc) as rn
  from public.subscription_vehicles
)
update public.subscription_vehicles sv
set is_primary = true
from ranked
where ranked.id = sv.id and ranked.rn = 1;

-- Enforce at most one primary per subscription.
create unique index subscription_vehicles_one_primary_per_sub
  on public.subscription_vehicles (subscription_id)
  where is_primary;
```

- [ ] **Step 2: Apply the migration to the Supabase project**

Use the `mcp__supabase__apply_migration` tool with `name: "subscription_vehicles_is_primary"` and the SQL from Step 1 as `query`. This is an additive, backward-compatible schema change (new column + backfill + index) applied directly to the linked Supabase project — confirm with the user before running if you are not certain which project is linked (check via `mcp__supabase__list_projects` / `mcp__supabase__get_project` first).

- [ ] **Step 3: Verify the backfill**

Use `mcp__supabase__execute_sql` to run:

```sql
select subscription_id, count(*) filter (where is_primary) as primary_count, count(*) as total
from public.subscription_vehicles
group by subscription_id
having count(*) filter (where is_primary) <> 1;
```

Expected: zero rows returned (every subscription with at least one vehicle has exactly one primary). If any subscription has 0 vehicles, it won't appear in `subscription_vehicles` at all, so this query is safe.

- [ ] **Step 4: Update `types/database.types.ts`**

Change lines 929-953 from:

```ts
      subscription_vehicles: {
        Row: {
          created_at: string
          id: string
          stripe_item_id: string | null
          subscription_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          stripe_item_id?: string | null
          subscription_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          stripe_item_id?: string | null
          subscription_id?: string
          updated_at?: string
          vehicle_id?: string
        }
```

to:

```ts
      subscription_vehicles: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          stripe_item_id: string | null
          subscription_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          stripe_item_id?: string | null
          subscription_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          stripe_item_id?: string | null
          subscription_id?: string
          updated_at?: string
          vehicle_id?: string
        }
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260721000000_subscription_vehicles_is_primary.sql types/database.types.ts
git commit -m "feat(db): add is_primary column to subscription_vehicles"
```

---

### Task 2: Wire `is_primary` into `subscriptionService.ts` and the `Subscription` type

**Files:**
- Modify: `lib/services/subscriptionService.ts:28-67`
- Modify: `types/index.ts:92-102`

**Interfaces:**
- Consumes: `subscription_vehicles.is_primary` (Task 1).
- Produces: `Subscription.vehicles[]` items now include `is_primary: boolean`, and `getActiveSubscription()` returns vehicles ordered primary-first (`is_primary desc, created_at asc`) instead of `id asc`. Every downstream consumer of `Subscription["vehicles"]` (already `pricing.vehiclePricing[0]` in `subscription-status.tsx`) keeps working unchanged because primary still lands at index 0.

- [ ] **Step 1: Update the `Subscription` type**

In `types/index.ts`, change the `vehicles` array shape (lines 92-102) from:

```ts
  vehicles?: Array<{
    id: string;
    subscription_vehicle_id: string;
    stripe_item_id?: string | null;
    year: number;
    make: string;
    model: string;
    body_type?: string;
    colors?: string[];
    license_plate: string;
  }>;
```

to:

```ts
  vehicles?: Array<{
    id: string;
    subscription_vehicle_id: string;
    stripe_item_id?: string | null;
    is_primary: boolean;
    year: number;
    make: string;
    model: string;
    body_type?: string;
    colors?: string[];
    license_plate: string;
  }>;
```

- [ ] **Step 2: Update `getActiveSubscription` to select and order by `is_primary`**

In `lib/services/subscriptionService.ts`, change the vehicle query (lines 28-46) from:

```ts
  const { data: vehicles, error: vehicleError } = await supabase
    .from("subscription_vehicles")
    .select(
      `
      id,
      stripe_item_id,
      vehicle:vehicles (
        id,
        year,
        make,
        model,
        body_type,
        colors,
        license_plate
      )
    `
    )
    .eq("subscription_id", subs.id)
    .order("id", { ascending: true });
```

to:

```ts
  const { data: vehicles, error: vehicleError } = await supabase
    .from("subscription_vehicles")
    .select(
      `
      id,
      stripe_item_id,
      is_primary,
      vehicle:vehicles (
        id,
        year,
        make,
        model,
        body_type,
        colors,
        license_plate
      )
    `
    )
    .eq("subscription_id", subs.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
```

- [ ] **Step 3: Include `is_primary` in the mapped vehicle shape**

Change the `vehicles` mapping (lines 57-67) from:

```ts
    vehicles: (vehicles || [])
      .map((v: any) =>
        v.vehicle
          ? {
              ...v.vehicle,
              subscription_vehicle_id: v.id,
              stripe_item_id: v.stripe_item_id ?? null,
            }
          : null
      )
      .filter(Boolean),
```

to:

```ts
    vehicles: (vehicles || [])
      .map((v: any) =>
        v.vehicle
          ? {
              ...v.vehicle,
              subscription_vehicle_id: v.id,
              stripe_item_id: v.stripe_item_id ?? null,
              is_primary: v.is_primary ?? false,
            }
          : null
      )
      .filter(Boolean),
```

- [ ] **Step 4: Manual verification**

Run `npm run dev`, sign in as a user with an active subscription that has at least one family vehicle, and open `/dashboard/billing`. Confirm the "Primary Vehicle" and "Family Vehicles" sections render exactly as before (no visual change expected — this task only changes how primary is determined internally, and it should still resolve to the same vehicle it did before the migration since Task 1's backfill picked the same earliest-vehicle-by-`created_at`).

- [ ] **Step 5: Commit**

```bash
git add lib/services/subscriptionService.ts types/index.ts
git commit -m "feat(subscription): read is_primary instead of inferring from row order"
```

---

### Task 3: Stamp `is_primary` at vehicle-creation time in the Stripe webhook

**Files:**
- Modify: `app/api/webhook/route.ts:762-798` (initial checkout vehicle linking)
- Modify: `app/api/webhook/route.ts:975-997` (single-vehicle subscription update handler)

**Interfaces:**
- Consumes: `subscription_vehicles.is_primary` (Task 1).
- Produces: every newly-created `subscription_vehicles` row for a subscription's first/primary vehicle now has `is_primary: true` explicitly set at insert time, instead of relying on later order-based inference.

- [ ] **Step 1: Mark the first vehicle as primary during checkout completion**

In `app/api/webhook/route.ts`, change the `newVehicleLinks` construction (lines 763-768) from:

```ts
    const newVehicleLinks = vehicleIds
      .filter((vid: string) => !existingVehicleIds.has(vid))
      .map((vehicleId: string) => ({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId.trim(),
      }));
```

to:

```ts
    const newVehicleLinks = vehicleIds
      .filter((vid: string) => !existingVehicleIds.has(vid))
      .map((vehicleId: string, index: number) => ({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId.trim(),
        is_primary: index === 0 && existingVehicleIds.size === 0,
      }));
```

This marks the vehicle at position 0 of `vehicleIds` as primary only when there are no pre-existing links for this subscription (i.e. this really is the first vehicle ever linked) — avoiding a second `is_primary: true` row if this handler runs again for a subscription that already has a primary.

- [ ] **Step 2: Fix the `stripe_item_id` re-fetch ordering to match**

Change the re-fetch query (lines 794-798) from:

```ts
        const { data: allLinks } = await supabase
          .from("subscription_vehicles")
          .select("id, vehicle_id")
          .eq("subscription_id", subscriptionRow.id)
          .order("id", { ascending: true });
```

to:

```ts
        const { data: allLinks } = await supabase
          .from("subscription_vehicles")
          .select("id, vehicle_id")
          .eq("subscription_id", subscriptionRow.id)
          .order("is_primary", { ascending: false })
          .order("created_at", { ascending: true });
```

- [ ] **Step 3: Mark the vehicle as primary in the single-vehicle update handler**

In `app/api/webhook/route.ts`, change the insert branch (lines 990-996) from:

```ts
    } else {
      // Insert new link
      await supabase.from("subscription_vehicles").insert({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId,
      });
    }
```

to:

```ts
    } else {
      // Insert new link. This handler only runs for single-vehicle
      // subscriptions (vehicle_id comes from subscription metadata, not a
      // multi-vehicle array), so a freshly-inserted link is always primary.
      await supabase.from("subscription_vehicles").insert({
        subscription_id: subscriptionRow.id,
        vehicle_id: vehicleId,
        is_primary: true,
      });
    }
```

- [ ] **Step 4: Manual verification**

This handler only runs on live Stripe webhook events, so it can't be triggered directly in dev without a real checkout. Instead, statically verify: re-read the edited blocks and confirm `is_primary` is only ever set `true` for a subscription's first vehicle in both code paths, and that Task 1's unique partial index (`subscription_vehicles_one_primary_per_sub`) would reject a second `true` row if this logic were ever wrong — i.e. a bug here fails loudly (insert error) rather than silently corrupting data.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhook/route.ts
git commit -m "feat(webhook): stamp is_primary when linking a subscription's first vehicle"
```

---

### Task 4: Use `is_primary` in the remove-vehicle route's primary guard

**Files:**
- Modify: `app/api/subscription/remove-vehicle/route.ts:53-86`

**Interfaces:**
- Consumes: `subscription_vehicles.is_primary` (Task 1).
- Produces: unchanged route contract (`POST /api/subscription/remove-vehicle` with `{ subscriptionVehicleId }`) — only the internal primary check changes from index-based to column-based.

- [ ] **Step 1: Select `is_primary` and order by it**

Change the vehicle fetch (lines 53-58) from:

```ts
  // Fetch all subscription vehicles ordered by insertion (first = primary)
  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id")
    .eq("subscription_id", sub.id)
    .order("id", { ascending: true });
```

to:

```ts
  // Fetch all subscription vehicles, primary first (matches subscriptionService.ts ordering)
  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id, is_primary")
    .eq("subscription_id", sub.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
```

- [ ] **Step 2: Replace the index-0 primary check with the `is_primary` column**

Change (lines 78-86) from:

```ts
  if (vehicleIndex === 0) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the primary vehicle. Cancel your subscription instead.",
      },
      { status: 400 }
    );
  }

  const vehicleToRemove = allSubVehicles[vehicleIndex];
```

to:

```ts
  const vehicleToRemove = allSubVehicles[vehicleIndex];

  if (vehicleToRemove.is_primary) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the primary vehicle here. Use the primary-vehicle unsubscribe control instead.",
      },
      { status: 400 }
    );
  }
```

(`vehicleIndex` is still used below this point to resolve the Stripe item via metadata/positional fallback — that logic is unchanged and still valid since `allSubVehicles` is still consistently ordered.)

- [ ] **Step 3: Manual verification**

Start the dev server, sign in as a user with 2+ vehicles on their subscription. Via the UI (or `curl -X POST http://localhost:3000/api/subscription/remove-vehicle -H "Content-Type: application/json" -d '{"subscriptionVehicleId":"<a family vehicle's id>"}'` with an authenticated session cookie), confirm removing a family vehicle still succeeds. Then attempt to remove the primary vehicle's `subscriptionVehicleId` — confirm you get `{"error":"Cannot remove the primary vehicle here. Use the primary-vehicle unsubscribe control instead."}` with a 400 status.

- [ ] **Step 4: Commit**

```bash
git add app/api/subscription/remove-vehicle/route.ts
git commit -m "feat(subscription): guard primary removal using is_primary column"
```

---

### Task 5: New email templates for vehicle added, removed, and primary-swapped

**Files:**
- Modify: `lib/email/subscription-emails.ts` (append after the existing `sendSubscriptionCancelledEmail`, i.e. after line 365)

**Interfaces:**
- Produces:
  - `sendFamilyVehicleAddedEmail({ to, name, licensePlate, newTotal, billingCycle }: { to: string; name: string; licensePlate: string; newTotal: number; billingCycle: string }): Promise<void>`
  - `sendFamilyVehicleRemovedEmail({ to, name, licensePlate, newTotal, billingCycle }: { to: string; name: string; licensePlate: string; newTotal: number; billingCycle: string }): Promise<void>`
  - `sendPrimaryVehicleSwappedEmail({ to, name, oldPrimaryLabel, newPrimaryLabel, newTotal, billingCycle }: { to: string; name: string; oldPrimaryLabel: string; newPrimaryLabel: string; newTotal: number; billingCycle: string }): Promise<void>`

- [ ] **Step 1: Append the three new email functions**

Add this block at the end of `lib/email/subscription-emails.ts` (after the closing brace of `sendSubscriptionCancelledEmail`, line 365):

```ts

// ─────────────────────────────────────────────────────────────
// 4. FAMILY VEHICLE ADDED
// ─────────────────────────────────────────────────────────────
export async function sendFamilyVehicleAddedEmail({
  to,
  name,
  licensePlate,
  newTotal,
  billingCycle,
}: {
  to: string;
  name: string;
  licensePlate: string;
  newTotal: number; // in dollars
  billingCycle: string; // "month" | "year"
}) {
  const billingUrl = `${SITE_URL}/dashboard/billing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">🚗</div>
    <h1>Vehicle Added</h1>
    <p>${licensePlate} is now on your family plan</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      You've added <strong>${licensePlate}</strong> to your Express Detailing
      subscription at 35% off — every month, no expiry.
    </p>

    <div class="card" style="border-left:4px solid #16a34a;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">Vehicle Added</td>
          <td align="right" style="font-size:14px;color:#374151;">${licensePlate}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">New Recurring Total</td>
          <td align="right" style="font-size:20px;font-weight:700;color:#0f172a;">
            $${newTotal.toFixed(2)}/${billingCycle}
          </td>
        </tr>
      </table>
    </div>

    <div class="cta">
      <a href="${billingUrl}" class="btn" style="background:linear-gradient(135deg,#16a34a,#15803d);">
        View Billing
      </a>
    </div>

    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `✅ ${licensePlate} added to your subscription — 35% off`,
    html: emailWrapper(
      "linear-gradient(135deg,#16a34a 0%,#15803d 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] family vehicle added send error:", error);
  else console.log("[email] family vehicle added email sent to:", to);
}

// ─────────────────────────────────────────────────────────────
// 5. FAMILY VEHICLE REMOVED
// ─────────────────────────────────────────────────────────────
export async function sendFamilyVehicleRemovedEmail({
  to,
  name,
  licensePlate,
  newTotal,
  billingCycle,
}: {
  to: string;
  name: string;
  licensePlate: string;
  newTotal: number; // in dollars
  billingCycle: string;
}) {
  const billingUrl = `${SITE_URL}/dashboard/billing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">👋</div>
    <h1>Vehicle Unsubscribed</h1>
    <p>${licensePlate} has been removed from your plan</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      <strong>${licensePlate}</strong> has been unsubscribed from your Express
      Detailing family plan. Your other vehicles keep their current pricing.
    </p>

    <div class="card">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">Vehicle Removed</td>
          <td align="right" style="font-size:14px;color:#374151;">${licensePlate}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">New Recurring Total</td>
          <td align="right" style="font-size:20px;font-weight:700;color:#0f172a;">
            $${newTotal.toFixed(2)}/${billingCycle}
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size:14px;color:#6b7280;text-align:center;">
      A prorated credit for the current period has been applied automatically.
    </p>

    <div class="cta">
      <a href="${billingUrl}" class="btn" style="background:linear-gradient(135deg,#1d4ed8,#1e40af);">
        View Billing
      </a>
    </div>

    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `${licensePlate} unsubscribed from your family plan`,
    html: emailWrapper(
      "linear-gradient(135deg,#374151 0%,#1f2937 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] family vehicle removed send error:", error);
  else console.log("[email] family vehicle removed email sent to:", to);
}

// ─────────────────────────────────────────────────────────────
// 6. PRIMARY VEHICLE SWAPPED
// ─────────────────────────────────────────────────────────────
export async function sendPrimaryVehicleSwappedEmail({
  to,
  name,
  oldPrimaryLabel,
  newPrimaryLabel,
  newTotal,
  billingCycle,
}: {
  to: string;
  name: string;
  oldPrimaryLabel: string;
  newPrimaryLabel: string;
  newTotal: number; // in dollars
  billingCycle: string;
}) {
  const billingUrl = `${SITE_URL}/dashboard/billing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">🔄</div>
    <h1>Primary Vehicle Updated</h1>
    <p>${newPrimaryLabel} is now your primary vehicle</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      You unsubscribed <strong>${oldPrimaryLabel}</strong> as your primary
      vehicle. Since you still have other vehicles on your plan, we've made
      <strong>${newPrimaryLabel}</strong> your new primary vehicle — it now
      bills at the full plan rate and anchors your family discount for any
      remaining vehicles.
    </p>

    <div class="card" style="border-left:4px solid #1d4ed8;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">Unsubscribed</td>
          <td align="right" style="font-size:14px;color:#374151;">${oldPrimaryLabel}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">New Primary Vehicle</td>
          <td align="right" style="font-size:14px;color:#374151;">${newPrimaryLabel}</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#6b7280;padding:4px 0;">New Recurring Total</td>
          <td align="right" style="font-size:20px;font-weight:700;color:#0f172a;">
            $${newTotal.toFixed(2)}/${billingCycle}
          </td>
        </tr>
      </table>
    </div>

    <div class="cta">
      <a href="${billingUrl}" class="btn" style="background:linear-gradient(135deg,#1d4ed8,#1e40af);">
        View Billing
      </a>
    </div>

    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your primary vehicle is now ${newPrimaryLabel}`,
    html: emailWrapper(
      "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] primary vehicle swapped send error:", error);
  else console.log("[email] primary vehicle swapped email sent to:", to);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors referencing `lib/email/subscription-emails.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/email/subscription-emails.ts
git commit -m "feat(email): add vehicle-added, vehicle-removed, primary-swapped templates"
```

---

### Task 6: Send emails from add-vehicle and remove-vehicle routes

**Files:**
- Modify: `app/api/subscription/add-vehicle/route.ts:1-4,277-279`
- Modify: `app/api/subscription/remove-vehicle/route.ts:1-16,144-159`

**Interfaces:**
- Consumes: `sendFamilyVehicleAddedEmail`, `sendFamilyVehicleRemovedEmail` (Task 5).
- Produces: no change to either route's request/response contract — purely adds a side-effecting email send before the success response.

- [ ] **Step 1: Import the email function and compute the new total in `add-vehicle/route.ts`**

Add to the imports (after line 3, `import { ensureVehicle } from "@/utils/vehicle";`):

```ts
import { sendFamilyVehicleAddedEmail } from "@/lib/email/subscription-emails";
```

- [ ] **Step 2: Send the email before returning success**

Change the end of `add-vehicle/route.ts` (lines 265-279) from:

```ts
  if (linkError) {
    console.error("[add-vehicle] db link error:", linkError.message);
    // Rollback the Stripe item
    await stripe.subscriptionItems.del(newStripeItem.id, {
      proration_behavior: "none",
    });
    return NextResponse.json(
      { error: "Failed to link vehicle to subscription" },
      { status: 500 }
    );
  }

  console.log("[add-vehicle] success, vehicleId:", vehicleId);
  return NextResponse.json({ success: true, vehicleId });
}
```

to:

```ts
  if (linkError) {
    console.error("[add-vehicle] db link error:", linkError.message);
    // Rollback the Stripe item
    await stripe.subscriptionItems.del(newStripeItem.id, {
      proration_behavior: "none",
    });
    return NextResponse.json(
      { error: "Failed to link vehicle to subscription" },
      { status: 500 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email) {
    await sendFamilyVehicleAddedEmail({
      to: user.email,
      name: profile?.full_name ?? "there",
      licensePlate: normalizedPlate,
      newTotal: (originalBaseAmount + targetAmount * currentVehicleCount) / 100,
      billingCycle: sub.billing_cycle ?? "month",
    });
  }

  console.log("[add-vehicle] success, vehicleId:", vehicleId);
  return NextResponse.json({ success: true, vehicleId });
}
```

(`originalBaseAmount` is the primary vehicle's full price in cents and `targetAmount` is the per-family-vehicle discounted price in cents, both already computed earlier in this route; `currentVehicleCount` is the count of family vehicles *before* this addition, so `currentVehicleCount` family vehicles at `targetAmount` plus the one just added equals `currentVehicleCount` total family vehicles after — wait: before this add there were `currentVehicleCount` vehicles total including primary if `currentVehicleCount` counted all rows. Re-derive precisely: `currentVehicleCount` in this file is `(sub.subscription_vehicles as any[])?.length` — the count *before* adding, of **all** vehicles including primary. After adding one family vehicle, total vehicles = `currentVehicleCount + 1`, of which `currentVehicleCount` are family vehicles (all vehicles except the primary). So new total in cents = `originalBaseAmount + targetAmount * currentVehicleCount`.)

- [ ] **Step 3: Import the email function and compute the new total in `remove-vehicle/route.ts`**

Add to the imports (after line 3, `import { NextResponse } from "next/server";`):

```ts
import { sendFamilyVehicleRemovedEmail } from "@/lib/email/subscription-emails";
```

- [ ] **Step 4: Extend the subscription fetch with plan/billing-cycle columns**

Change the original subscription fetch (lines 39-44) from:

```ts
  // Get user's active subscription
  const { data: sub } = await supabase
    .from("user_subscription")
    .select("id, stripe_subscription_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
```

to:

```ts
  // Get user's active subscription
  const { data: sub } = await supabase
    .from("user_subscription")
    .select("id, stripe_subscription_id, subscription_plan_id, billing_cycle")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
```

- [ ] **Step 5: Fetch plan base price and send the email before returning success**

Change the end of `remove-vehicle/route.ts` (lines 144-160) from:

```ts
  // Use admin client to bypass RLS on subscription_vehicles delete
  const { error: deleteError } = await admin
    .from("subscription_vehicles")
    .delete()
    .eq("id", subscriptionVehicleId);

  if (deleteError) {
    console.error("[remove-vehicle] db delete error:", deleteError.message);
    return NextResponse.json(
      { error: "Vehicle removed from billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  console.log("[remove-vehicle] success, removed subscription_vehicle:", subscriptionVehicleId);
  return NextResponse.json({ success: true });
}
```

to:

```ts
  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("license_plate")
    .eq("id", vehicleToRemove.vehicle_id)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("monthly_price, yearly_price")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email && plan) {
    const remainingFamilyCount = allSubVehicles.length - 2; // minus primary, minus the one just removed
    const basePrice =
      sub.billing_cycle === "year"
        ? Number(plan.yearly_price ?? 0)
        : Number(plan.monthly_price ?? 0);
    const newTotal = basePrice + basePrice * 0.65 * Math.max(remainingFamilyCount, 0);

    await sendFamilyVehicleRemovedEmail({
      to: user.email,
      name: profile?.full_name ?? "there",
      licensePlate: vehicleRow?.license_plate ?? "your vehicle",
      newTotal,
      billingCycle: sub.billing_cycle ?? "month",
    });
  }

  console.log("[remove-vehicle] success, removed subscription_vehicle:", subscriptionVehicleId);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors in either route file.

- [ ] **Step 7: Manual verification**

With the dev server running and `RESEND_API_KEY` set, add a family vehicle via the UI, confirm a "Vehicle Added" email arrives (check the Resend dashboard or server logs for `[email] family vehicle added email sent to:`). Then remove a family vehicle and confirm a "Vehicle Unsubscribed" email arrives similarly.

- [ ] **Step 8: Commit**

```bash
git add app/api/subscription/add-vehicle/route.ts app/api/subscription/remove-vehicle/route.ts
git commit -m "feat(subscription): email on vehicle add/remove"
```

---

### Task 7: New `swap-primary-vehicle` API route

**Files:**
- Create: `app/api/subscription/swap-primary-vehicle/route.ts`

**Interfaces:**
- Consumes: `sendPrimaryVehicleSwappedEmail` (Task 5), `subscription_vehicles.is_primary` (Task 1).
- Produces: `POST /api/subscription/swap-primary-vehicle` accepting `{ newPrimarySubscriptionVehicleId: string }` (JSON body), returning `{ success: true }` (200) or `{ error: string }` (400/401/404/500) — same response shape convention as `remove-vehicle`/`add-vehicle`.

- [ ] **Step 1: Write the route**

```ts
import { stripe } from "@/lib/stripe/stripe";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPrimaryVehicleSwappedEmail } from "@/lib/email/subscription-emails";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    return await handler(req);
  } catch (err: any) {
    console.error("[swap-primary-vehicle] unhandled error:", err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

async function handler(req: Request) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newPrimarySubscriptionVehicleId } = await req.json();

  if (!newPrimarySubscriptionVehicleId) {
    return NextResponse.json(
      { error: "newPrimarySubscriptionVehicleId is required" },
      { status: 400 }
    );
  }

  const { data: sub } = await supabase
    .from("user_subscription")
    .select("id, stripe_subscription_id, subscription_plan_id, billing_cycle")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  const { data: allSubVehicles } = await supabase
    .from("subscription_vehicles")
    .select("id, vehicle_id, stripe_item_id, is_primary, vehicles(license_plate)")
    .eq("subscription_id", sub.id);

  if (!allSubVehicles || allSubVehicles.length === 0) {
    return NextResponse.json(
      { error: "No vehicles found on this subscription" },
      { status: 404 }
    );
  }

  const oldPrimary = allSubVehicles.find((v) => v.is_primary);
  const target = allSubVehicles.find((v) => v.id === newPrimarySubscriptionVehicleId);

  if (!oldPrimary) {
    return NextResponse.json(
      { error: "No primary vehicle found on this subscription" },
      { status: 404 }
    );
  }

  if (!target) {
    return NextResponse.json(
      { error: "Chosen vehicle not found on this subscription" },
      { status: 404 }
    );
  }

  if (target.is_primary) {
    return NextResponse.json(
      { error: "Chosen vehicle is already the primary vehicle" },
      { status: 400 }
    );
  }

  // Resolve the plan's full base Stripe price (same lookup pattern as add-vehicle)
  const { data: plan } = await supabase
    .from("subscription_plans")
    .select("stripe_price_id_monthly, stripe_price_id_yearly")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const planPriceId =
    sub.billing_cycle === "month"
      ? plan?.stripe_price_id_monthly
      : plan?.stripe_price_id_yearly;

  let fullPriceId: string | null = null;

  if (planPriceId?.startsWith("price_")) {
    fullPriceId = planPriceId;
  } else if (planPriceId?.startsWith("prod_")) {
    const prices = await stripe.prices.list({
      product: planPriceId,
      active: true,
      recurring: { interval: sub.billing_cycle === "month" ? "month" : "year" },
      limit: 1,
    });
    fullPriceId = prices.data[0]?.id ?? null;
  }

  if (!fullPriceId) {
    return NextResponse.json(
      { error: "Could not resolve full-price Stripe price for this plan" },
      { status: 500 }
    );
  }

  // Resolve the old primary's Stripe item id (fallback if not stored in DB)
  let oldPrimaryItemId: string | null = oldPrimary.stripe_item_id ?? null;
  let stripeSub: Awaited<ReturnType<typeof stripe.subscriptions.retrieve>> | null = null;

  if (!oldPrimaryItemId || !target.stripe_item_id) {
    stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  }

  if (!oldPrimaryItemId && stripeSub) {
    const byMetadata = stripeSub.items.data.find(
      (item: any) => item.price?.metadata?.vehicle_index === "0"
    );
    oldPrimaryItemId = byMetadata?.id ?? stripeSub.items.data[0]?.id ?? null;
  }

  let targetItemId: string | null = target.stripe_item_id ?? null;

  if (!targetItemId && stripeSub) {
    const targetIndex = allSubVehicles.findIndex((v) => v.id === target.id);
    targetItemId = stripeSub.items.data[targetIndex]?.id ?? null;
  }

  if (!targetItemId) {
    return NextResponse.json(
      { error: "Could not resolve the chosen vehicle's Stripe billing item" },
      { status: 500 }
    );
  }

  // Promote the target vehicle's Stripe item to the full base price
  await stripe.subscriptionItems.update(targetItemId, {
    price: fullPriceId,
    proration_behavior: "create_prorations",
  });

  console.log("[swap-primary-vehicle] promoted item to full price:", targetItemId);

  // Remove the old primary's Stripe item
  if (oldPrimaryItemId) {
    try {
      await stripe.subscriptionItems.del(oldPrimaryItemId, {
        proration_behavior: "create_prorations",
      });
      console.log("[swap-primary-vehicle] old primary stripe item deleted:", oldPrimaryItemId);
    } catch (stripeErr: any) {
      console.warn(
        "[swap-primary-vehicle] stripe delete of old primary failed, continuing with DB update:",
        stripeErr?.message
      );
    }
  } else {
    console.warn("[swap-primary-vehicle] no old primary stripe item id found — skipping Stripe delete");
  }

  // DB: remove old primary row, promote target row
  const { error: deleteError } = await admin
    .from("subscription_vehicles")
    .delete()
    .eq("id", oldPrimary.id);

  if (deleteError) {
    console.error("[swap-primary-vehicle] db delete error:", deleteError.message);
    return NextResponse.json(
      { error: "Vehicles updated in billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("subscription_vehicles")
    .update({ is_primary: true })
    .eq("id", target.id);

  if (updateError) {
    console.error("[swap-primary-vehicle] db update error:", updateError.message);
    return NextResponse.json(
      { error: "Vehicles updated in billing but failed to update records. Please contact support." },
      { status: 500 }
    );
  }

  const { data: plan2 } = await supabase
    .from("subscription_plans")
    .select("monthly_price, yearly_price")
    .eq("id", sub.subscription_plan_id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (user.email && plan2) {
    const basePrice =
      sub.billing_cycle === "year"
        ? Number(plan2.yearly_price ?? 0)
        : Number(plan2.monthly_price ?? 0);
    const remainingFamilyCount = allSubVehicles.length - 2; // total minus old primary minus promoted target
    const newTotal = basePrice + basePrice * 0.65 * Math.max(remainingFamilyCount, 0);

    const oldPrimaryLabel = (oldPrimary as any).vehicles?.license_plate ?? "your old primary vehicle";
    const newPrimaryLabel = (target as any).vehicles?.license_plate ?? "your new primary vehicle";

    await sendPrimaryVehicleSwappedEmail({
      to: user.email,
      name: profile?.full_name ?? "there",
      oldPrimaryLabel,
      newPrimaryLabel,
      newTotal,
      billingCycle: sub.billing_cycle ?? "month",
    });
  }

  console.log("[swap-primary-vehicle] success, new primary:", target.id);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `app/api/subscription/swap-primary-vehicle/route.ts`.

- [ ] **Step 3: Manual verification**

With the dev server running, sign in as a user with a primary vehicle plus at least one family vehicle. Get that family vehicle's `subscription_vehicle_id` (visible in the billing page's network tab or via a quick `select id, vehicle_id, is_primary from subscription_vehicles where subscription_id = '<id>'` query through `mcp__supabase__execute_sql`). Call:

```bash
curl -X POST http://localhost:3000/api/subscription/swap-primary-vehicle \
  -H "Content-Type: application/json" \
  -H "Cookie: <your authenticated session cookie>" \
  -d '{"newPrimarySubscriptionVehicleId":"<that family vehicle id>"}'
```

Expected: `{"success":true}`. Then verify in Stripe (dashboard or `stripe.subscriptions.retrieve`) that the subscription now has one fewer item, the promoted item's price equals the plan's full base price, and in Supabase that the promoted row now has `is_primary = true` and the old primary row is gone. Confirm the swap email arrived.

- [ ] **Step 4: Commit**

```bash
git add app/api/subscription/swap-primary-vehicle/route.ts
git commit -m "feat(subscription): add primary-vehicle swap route"
```

---

### Task 8: Relabel family-vehicle removal copy to "unsubscribe"

**Files:**
- Modify: `components/remove-vehicle-dialog.tsx`

**Interfaces:**
- No prop/behavior changes — copy only.

- [ ] **Step 1: Update the dialog copy**

Change lines 72-96 from:

```tsx
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Family Vehicle</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Remove <strong>{vehicleLabel}</strong> from your subscription?
            </span>
            <span className="block text-sm text-muted-foreground">
              Your billing will decrease by{" "}
              <strong>
                ${discountedPrice.toFixed(2)}/{billingCycle}
              </strong>{" "}
              starting next cycle. Stripe will create a prorated credit for the
              current period.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Vehicle</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? "Removing..." : "Yes, Remove Vehicle"}
          </AlertDialogAction>
        </AlertDialogFooter>
```

to:

```tsx
        <AlertDialogHeader>
          <AlertDialogTitle>Unsubscribe This Vehicle</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Unsubscribe <strong>{vehicleLabel}</strong> from your subscription?
            </span>
            <span className="block text-sm text-muted-foreground">
              Your billing will decrease by{" "}
              <strong>
                ${discountedPrice.toFixed(2)}/{billingCycle}
              </strong>{" "}
              starting next cycle. Stripe will create a prorated credit for the
              current period.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Keep Vehicle</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {loading ? "Unsubscribing..." : "Yes, Unsubscribe"}
          </AlertDialogAction>
        </AlertDialogFooter>
```

- [ ] **Step 2: Update the success toast**

Change line 54 from:

```ts
      toast.success(`${vehicle.license_plate} removed from your subscription.`);
```

to:

```ts
      toast.success(`${vehicle.license_plate} unsubscribed from your subscription.`);
```

- [ ] **Step 3: Manual verification**

Run `npm run dev`, open the billing page, click the unsubscribe icon on a family vehicle, confirm the dialog reads "Unsubscribe This Vehicle" / "Unsubscribe ... from your subscription?" / "Yes, Unsubscribe", and the success toast reads "... unsubscribed from your subscription."

- [ ] **Step 4: Commit**

```bash
git add components/remove-vehicle-dialog.tsx
git commit -m "feat(ui): relabel family vehicle removal as unsubscribe"
```

---

### Task 9: New `SwapPrimaryVehicleDialog` component

**Files:**
- Create: `components/subscription/SwapPrimaryVehicleDialog.tsx`

**Interfaces:**
- Consumes: `POST /api/subscription/swap-primary-vehicle` (Task 7).
- Produces: `SwapPrimaryVehicleDialog` component with props:
  ```ts
  interface SwapPrimaryVehicleDialogProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentPrimary: { subscription_vehicle_id: string; license_plate: string; make?: string | null; model?: string | null };
    familyVehicles: Array<{ subscription_vehicle_id: string; license_plate: string; make?: string | null; model?: string | null }>;
    basePriceMonthly: number;
    billingCycle: string;
  }
  ```

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Car, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface SwapVehicle {
  subscription_vehicle_id: string;
  license_plate: string;
  make?: string | null;
  model?: string | null;
}

interface SwapPrimaryVehicleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentPrimary: SwapVehicle;
  familyVehicles: SwapVehicle[];
  basePriceMonthly: number;
  billingCycle: string;
}

function vehicleLabel(v: SwapVehicle) {
  return v.make && v.model
    ? `${v.make} ${v.model} (${v.license_plate})`
    : v.license_plate;
}

export function SwapPrimaryVehicleDialog({
  open,
  onClose,
  onSuccess,
  currentPrimary,
  familyVehicles,
  basePriceMonthly,
  billingCycle,
}: SwapPrimaryVehicleDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selectedId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/swap-primary-vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPrimarySubscriptionVehicleId: selectedId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to swap primary vehicle");

      toast.success("Primary vehicle updated.");
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSelectedId(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unsubscribe Primary Vehicle</DialogTitle>
          <DialogDescription>
            Unsubscribing <strong>{vehicleLabel(currentPrimary)}</strong> requires
            choosing a new primary vehicle, since you still have family vehicles
            on your plan. The vehicle you choose will move to the full plan rate
            of ${basePriceMonthly.toFixed(2)}/{billingCycle} and lose its 35%
            family discount.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {familyVehicles.map((v) => (
            <button
              key={v.subscription_vehicle_id}
              type="button"
              onClick={() => setSelectedId(v.subscription_vehicle_id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                selectedId === v.subscription_vehicle_id
                  ? "border-blue-500 bg-blue-50"
                  : "border-border hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Car className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">{vehicleLabel(v)}</span>
              </span>
              {selectedId === v.subscription_vehicle_id && (
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              )}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedId}
            className="bg-blue-900 hover:bg-blue-800"
          >
            {loading ? "Swapping..." : "Confirm Swap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `components/subscription/SwapPrimaryVehicleDialog.tsx` (it isn't wired up anywhere yet, so this only checks the file is internally type-correct).

- [ ] **Step 3: Commit**

```bash
git add components/subscription/SwapPrimaryVehicleDialog.tsx
git commit -m "feat(ui): add SwapPrimaryVehicleDialog component"
```

---

### Task 10: Wire everything into `subscription-status.tsx`

**Files:**
- Modify: `components/subscription-status.tsx`

**Interfaces:**
- Consumes: `SwapPrimaryVehicleDialog` (Task 9), `MultiVehicleBenefitsDialog` (existing, `components/subscription/MultiVehicleBenefitsDialog.tsx`), `POST /api/cancel-subscription` (existing, unchanged).
- Produces: primary vehicle card gains an unsubscribe icon; "Family Vehicles" heading gains an info icon; card gains an "Unsubscribe Everything" button + `AlertDialog`.

- [ ] **Step 1: Update imports**

Change lines 1-12 from:

```tsx
"use client";

import { Subscription } from "@/types";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Car, CheckCircle2, AlertCircle, XCircle, TriangleAlert, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { AddVehicleModal } from "./add-vehicle-modal";
import { RemoveVehicleDialog } from "./remove-vehicle-dialog";
```

to:

```tsx
"use client";

import { Subscription } from "@/types";
import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Car, CheckCircle2, AlertCircle, XCircle, TriangleAlert, Plus, Trash2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";
import { AddVehicleModal } from "./add-vehicle-modal";
import { RemoveVehicleDialog } from "./remove-vehicle-dialog";
import { SwapPrimaryVehicleDialog } from "./subscription/SwapPrimaryVehicleDialog";
import MultiVehicleBenefitsDialog from "./subscription/MultiVehicleBenefitsDialog";
import { toast } from "sonner";
```

- [ ] **Step 2: Add new state**

Change lines 28-30 from:

```tsx
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  type SubscriptionVehicle = NonNullable<Subscription["vehicles"]>[number];
  const [vehicleToRemove, setVehicleToRemove] = useState<SubscriptionVehicle | null>(null);
```

to:

```tsx
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  type SubscriptionVehicle = NonNullable<Subscription["vehicles"]>[number];
  const [vehicleToRemove, setVehicleToRemove] = useState<SubscriptionVehicle | null>(null);
  const [showSwapPrimary, setShowSwapPrimary] = useState(false);
  const [showBenefitsInfo, setShowBenefitsInfo] = useState(false);
  const [showUnsubscribeAll, setShowUnsubscribeAll] = useState(false);
  const [unsubscribingAll, setUnsubscribingAll] = useState(false);
```

- [ ] **Step 3: Add the "Unsubscribe Everything" handler**

Add this function after `handleUpdatePayment` (after line 116, before the `if (!subscription)` block):

```tsx
  const handleUnsubscribeEverything = async () => {
    setUnsubscribingAll(true);
    try {
      const res = await fetch("/api/cancel-subscription", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to cancel subscription");
      toast.success("Your subscription will be canceled at the end of the billing period.");
      setShowUnsubscribeAll(false);
      onVehicleChange?.();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setUnsubscribingAll(false);
    }
  };
```

- [ ] **Step 4: Add the primary vehicle unsubscribe icon**

Change the primary vehicle block (lines 259-282) from:

```tsx
              {(() => {
                const primary = pricing.vehiclePricing[0];
                return (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Car className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {primary.displayName}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          Primary vehicle
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${pricing.basePrice.toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">/{subscription.billing_cycle}</span>
                      </p>
                    </div>
                  </div>
                );
              })()}
```

to:

```tsx
              {(() => {
                const primary = pricing.vehiclePricing[0];
                return (
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                      <Car className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {primary.displayName}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-0.5">
                          Primary vehicle
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-900">
                        ${pricing.basePrice.toFixed(2)}
                        <span className="text-xs text-gray-500 ml-1">/{subscription.billing_cycle}</span>
                      </p>
                      <button
                        onClick={() =>
                          pricing.vehiclePricing.length > 1
                            ? setShowSwapPrimary(true)
                            : setShowUnsubscribeAll(true)
                        }
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Unsubscribe this vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}
```

- [ ] **Step 5: Relabel the family vehicle unsubscribe icon and add the info icon**

Change the "Family Vehicles" heading block (lines 287-295) from:

```tsx
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    Family Vehicles
                  </h4>
                  <span className="text-xs text-green-600 font-medium">
                    ✨ 35% Family Discount Every Month
                  </span>
                </div>
```

to:

```tsx
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      Family Vehicles
                    </h4>
                    <button
                      onClick={() => setShowBenefitsInfo(true)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Family vehicle benefits"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-xs text-green-600 font-medium">
                    ✨ 35% Family Discount Every Month
                  </span>
                </div>
```

Change the family vehicle trash button's `title` (line 328) from:

```tsx
                        title="Remove this vehicle"
```

to:

```tsx
                        title="Unsubscribe this vehicle"
```

- [ ] **Step 6: Add the "Unsubscribe Everything" button**

Add this block right after the "Add Family Vehicle" block and before the "Actions" comment (i.e. after line 466, before line 468's `{/* Actions */}`):

```tsx
        {/* Unsubscribe Everything */}
        {subscription.status === "active" && !subscription.cancel_at_period_end && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnsubscribeAll(true)}
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Unsubscribe Everything
            </Button>
          </div>
        )}
```

- [ ] **Step 7: Render the new dialogs**

Change the end of the component (lines 480-505) from:

```tsx
      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => onVehicleChange?.()}
        currentVehicleCount={pricing.vehiclePricing.length}
        basePriceMonthly={pricing.basePrice}
        billingCycle={subscription.billing_cycle}
        currentPeriodStart={subscription.current_period_start}
        currentPeriodEnd={subscription.current_period_end}
        currentTotalPrice={pricing.totalPrice}
      />

      {/* Remove Vehicle Dialog */}
      {vehicleToRemove && (
        <RemoveVehicleDialog
          open={!!vehicleToRemove}
          onClose={() => setVehicleToRemove(null)}
          onSuccess={() => onVehicleChange?.()}
          vehicle={vehicleToRemove}
          discountedPrice={pricing.basePrice * 0.65}
          billingCycle={subscription.billing_cycle}
        />
      )}
    </Card>
  );
}
```

to:

```tsx
      {/* Add Vehicle Modal */}
      <AddVehicleModal
        open={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => onVehicleChange?.()}
        currentVehicleCount={pricing.vehiclePricing.length}
        basePriceMonthly={pricing.basePrice}
        billingCycle={subscription.billing_cycle}
        currentPeriodStart={subscription.current_period_start}
        currentPeriodEnd={subscription.current_period_end}
        currentTotalPrice={pricing.totalPrice}
      />

      {/* Remove Vehicle Dialog */}
      {vehicleToRemove && (
        <RemoveVehicleDialog
          open={!!vehicleToRemove}
          onClose={() => setVehicleToRemove(null)}
          onSuccess={() => onVehicleChange?.()}
          vehicle={vehicleToRemove}
          discountedPrice={pricing.basePrice * 0.65}
          billingCycle={subscription.billing_cycle}
        />
      )}

      {/* Swap Primary Vehicle Dialog */}
      {showSwapPrimary && pricing.vehiclePricing.length > 1 && (
        <SwapPrimaryVehicleDialog
          open={showSwapPrimary}
          onClose={() => setShowSwapPrimary(false)}
          onSuccess={() => onVehicleChange?.()}
          currentPrimary={pricing.vehiclePricing[0].vehicle as any}
          familyVehicles={pricing.vehiclePricing.slice(1).map((p) => p.vehicle as any)}
          basePriceMonthly={pricing.basePrice}
          billingCycle={subscription.billing_cycle}
        />
      )}

      {/* Multi-Vehicle Benefits Info Dialog */}
      <MultiVehicleBenefitsDialog
        isOpen={showBenefitsInfo}
        onClose={() => setShowBenefitsInfo(false)}
      />

      {/* Unsubscribe Everything Dialog */}
      <AlertDialog open={showUnsubscribeAll} onOpenChange={(v) => !v && setShowUnsubscribeAll(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsubscribe from everything?</AlertDialogTitle>
            <AlertDialogDescription>
              This cancels your entire Express Detailing subscription — all vehicles,
              including any family vehicles — at the end of your current billing
              period ({new Date(subscription.current_period_end).toLocaleDateString()}).
              You'll keep access until then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={unsubscribingAll}>Keep My Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsubscribeEverything}
              disabled={unsubscribingAll}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {unsubscribingAll ? "Unsubscribing..." : "Yes, Unsubscribe Everything"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `components/subscription-status.tsx`.

- [ ] **Step 9: Manual verification**

Run `npm run dev`, open `/dashboard/billing` as a user with a primary + 2 family vehicles:
- Click the info icon next to "Family Vehicles" → `MultiVehicleBenefitsDialog` opens.
- Click the primary vehicle's unsubscribe icon → `SwapPrimaryVehicleDialog` opens (since family vehicles exist); pick one, confirm, verify success toast and the primary/family sections re-render with the new primary.
- Click "Unsubscribe Everything" → `AlertDialog` opens; cancel it, confirm nothing happened; reopen and confirm — verify success toast and (after refetch) the "Subscription Scheduled for Cancellation" banner appears (existing behavior, unchanged).
- As a user with only a primary vehicle (no family vehicles), click the primary's unsubscribe icon → confirm it opens the "Unsubscribe Everything" dialog directly, not the swap dialog.

- [ ] **Step 10: Commit**

```bash
git add components/subscription-status.tsx
git commit -m "feat(ui): wire unsubscribe-everything, primary swap, and benefits info into billing"
```

---

### Task 11: Remove the old native-confirm cancel button from the billing page

**Files:**
- Modify: `app/(dashboard)/dashboard/billing/page.tsx`

**Interfaces:**
- No new interfaces — removes now-redundant code.

- [ ] **Step 1: Remove the `handleCancelSubscription` function and `canceling` state**

Change lines 15-46 from:

```tsx
export default function BillingPage() {
  const { subscription, loading, error, refetch } = useSubscription();
  const { subscription: selfSubs } = useSelfServiceSubscription();
  const [canceling, setCanceling] = useState(false);

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel your subscription?")) return;

    try {
      setCanceling(true);
      const res = await fetch("/api/cancel-subscription", { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        alert(
          `Failed to cancel subscription: ${data.error || "Unknown error"}`
        );
        return;
      }

      await res.json();
      alert(
        "Your subscription will be canceled at the end of the billing period."
      );
      window.location.reload(); // refresh UI to reflect new status
    } catch (error) {
      console.error("Error canceling subscription:", error);
      alert("An unexpected error occurred.");
    } finally {
      setCanceling(false);
    }
  }

```

to:

```tsx
export default function BillingPage() {
  const { subscription, loading, error, refetch } = useSubscription();
  const { subscription: selfSubs } = useSelfServiceSubscription();

```

- [ ] **Step 2: Remove the "Cancel Subscription" button**

Change the "Management Actions" card's button row (lines 124-137) from:

```tsx
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/pricing">
                  <Settings className="w-4 h-4 mr-2" />
                  Change Plan
                </Link>
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? "Canceling..." : "Cancel Subscription"}
              </Button>
            </div>
```

to:

```tsx
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/dashboard/pricing">
                  <Settings className="w-4 h-4 mr-2" />
                  Change Plan
                </Link>
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              To cancel your subscription, use "Unsubscribe Everything" above.
            </p>
```

Update the surrounding copy in the same card (lines 119-122) from:

```tsx
            <p className="text-sm text-gray-600">
              Update your subscription plan, payment method, or cancel your
              subscription at any time.
            </p>
```

to:

```tsx
            <p className="text-sm text-gray-600">
              Update your subscription plan or payment method. To cancel,
              use "Unsubscribe Everything" in the subscription details above.
            </p>
```

- [ ] **Step 3: Verify no remaining references**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors (confirms `useState` import is still used elsewhere in the file if needed, or flags it as unused if not — check the top imports; `useState` is no longer used in this file after removing `canceling`, so also remove the now-unused `useState` import from line 6: `import { useState } from "react";`). If `tsc` doesn't flag unused imports (it often doesn't by default), manually check the file for the `useState` import and remove it if nothing else in the file uses `useState`.

- [ ] **Step 4: Manual verification**

Run `npm run dev`, open `/dashboard/billing`, confirm the "Manage Subscription" card no longer shows a "Cancel Subscription" button, and the new copy about using "Unsubscribe Everything" appears.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/dashboard/billing/page.tsx"
git commit -m "refactor(billing): remove redundant cancel button, defer to Unsubscribe Everything"
```

---

### Task 12: Full end-to-end verification + lint/build

**Files:** none (verification-only task)

**Interfaces:** none.

- [ ] **Step 1: Run the full lint and type-check**

```bash
npm run lint
npx tsc --noEmit -p tsconfig.json
```

Expected: no errors introduced by this feature (pre-existing unrelated warnings, if any, are out of scope).

- [ ] **Step 2: Run the existing test suite**

```bash
npm run test
```

Expected: all existing tests still pass (this feature doesn't touch `lib/pricing/*` or `lib/booking/*`, so none of the existing suite should be affected).

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: build succeeds with no new type or bundling errors.

- [ ] **Step 4: Full manual walkthrough**

With the dev server running and a test Stripe account + test user (with an active subscription, 1 primary + 2 family vehicles):

1. Add a family vehicle → confirm dialog copy, success toast, new vehicle appears, "Vehicle Added" email received.
2. Unsubscribe a family vehicle → confirm "Unsubscribe This Vehicle" dialog copy, success toast, vehicle disappears, billing total decreases, "Vehicle Unsubscribed" email received.
3. Click info icon → benefits dialog opens with correct content.
4. Unsubscribe the primary vehicle while family vehicles remain → swap dialog opens, pick a vehicle, confirm → new primary badge/pricing shown correctly, old primary gone, "Primary Vehicle Updated" email received, Stripe subscription has the promoted item at full price.
5. With only one vehicle remaining, click its unsubscribe icon → "Unsubscribe Everything" dialog opens directly (not the swap dialog) → confirm → subscription shows "Scheduled for Cancellation," existing cancellation-scheduled email received (via webhook, may take a few seconds in test mode).
6. Confirm the billing page's old "Cancel Subscription" button is gone.

- [ ] **Step 5: Report results**

Summarize pass/fail for each of the 6 walkthrough steps. If anything fails, return to the relevant task above and fix before considering the feature done — do not commit a "fix" here; go back and amend the responsible task's commit history with a new commit in that area.
