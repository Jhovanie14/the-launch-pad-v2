# Zelle and Pickup Instructions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff can record Zelle as a counter payment, and an owner-editable pickup note shows under the pickup hours everywhere customers see them.

**Architecture:**
- One migration widens `product_orders.paid_via` and adds `store_settings.pickup_note`.
- Zelle is a new `PaidVia` value carried through `orderFlow.ts`.
- The note rides on `PickupSettings`, from `getPickupSettings`, next to `pickupHours`. Every place that renders or emails the hours renders the note under them.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 tokens, Supabase, Vitest (no DOM, so components get source-level tests).

**Spec:** `docs/superpowers/specs/2026-11-25-zelle-pickup-note-design.md`

## Global Constraints

- **Files are CRLF.** Use the Edit tool, or normalise before multi-line replaces.
- **Migrations:** never applied by us. The user runs them, and the PR merges only after the column is confirmed live.
- **Values from the spec:**
  - `paid_via` allowed values: `stripe, cash, card_reader, counter_qr, zelle`.
  - Counter order: cash, card reader, Zelle, counter QR.
  - Label: "Zelle".
  - Note limit: 200 characters.
- **Copy:**
  - Refusal: "Choose how they paid: cash, card reader, Zelle or counter QR."
  - Customer payment copy says "cash, card or Zelle".
- **No hard-coded colours:** tokens only (`bg-paper`, `ring-line`, `text-ink-muted`, `text-on-night-muted`…).
- **Commits:** no Co-Authored-By trailer.

## Review Focus

1. **Migration not live yet:** `getPickupSettings` must still return the hours, because it selects `*`. Tested in Task 2.
2. **Note made only of spaces:** saved as null and hidden everywhere. Tested in Task 2.
3. **Delivery orders:** the confirmation email still shows no hours and no note when `fulfillmentMethod` is `"delivery"`. Tested in Task 3.
4. **Note with HTML characters** (for example `<b>` or `&`): escaped in emails through `text()`. Tested in Task 3.
5. **Zelle refunds:** handled as a store payment (`where: "store"`), never sent to Stripe. Covered by the existing `refundOrder.ts` logic, which branches on `paid_via === "stripe"`. Tested in Task 1.

---

### Task 1: Zelle as a counter payment

**Files:**
- Create: `supabase/migrations/20261125000000_zelle_pickup_note.sql`
- Create: `lib/products/zellePickupNoteMigration.test.ts`
- Modify:
  - `lib/products/orderFlow.ts` (`PaidVia`, `PAID_VIA_LABEL`, `COUNTER_METHODS`, the refusal copy at about line 165)
  - `app/admin/orders/orders-view.tsx` (`COUNTER_METHODS` at line 50, the picker grid at about line 470)
  - `app/(user)/products/cart/page.tsx` (the "Pay at the store" line)
  - `lib/email/product-order-emails.ts` (the ready email: "(cash, card or QR)" becomes "(cash, card or Zelle)")
- Test:
  - `lib/products/orderFlow.test.ts`
  - `lib/products/refundOrder.test.ts`
  - `lib/products/ordersPageSource.test.ts`, or the existing source test for orders-view and the cart
  - `lib/email/product-order-emails.test.ts`

**Interfaces:**
- Produces: `type PaidVia = "stripe" | "cash" | "card_reader" | "counter_qr" | "zelle"` and `PAID_VIA_LABEL.zelle === "Zelle"`.
- Produces, from the migration file used by Task 2:
  - the `store_settings.pickup_note` column (text, null allowed);
  - its check `char_length(pickup_note) <= 200`.

- [ ] **Step 1: Write the failing tests**
  - **Migration test:** the lowercased SQL contains:
    - `drop constraint if exists product_orders_paid_via_check`;
    - a new check listing `'stripe','cash','card_reader','counter_qr','zelle'`;
    - `add column if not exists pickup_note text`;
    - `char_length(pickup_note) <= 200`;
    - `notify pgrst, 'reload schema'`.
  - **orderFlow.test.ts:**
    - `applyStaffAction(order({ fulfilment_status: "ready" }), "take_payment", { ...ctx, paidVia: "zelle" })` returns `paid_via: "zelle"` and is completed;
    - `PAID_VIA_LABEL.zelle` is `"Zelle"`;
    - the refusal for a missing method throws exactly "Choose how they paid: cash, card reader, Zelle or counter QR.".
  - **refundOrder.test.ts:** an order with `paid_via: "zelle"` refunds as a store payment and never calls Stripe. Follow that file's existing cash case.
  - **Source tests:**
    - orders-view's `COUNTER_METHODS` equals `["cash", "card_reader", "zelle", "counter_qr"]`;
    - the picker uses `grid-cols-2` and `sm:grid-cols-4`;
    - the cart source contains "Cash, card or Zelle";
    - the ready email with `amountDue` contains "cash, card or Zelle" and not "or QR".
- [ ] **Step 2: Run and see them fail**
  Run: `npx vitest run lib/products lib/email`
  Expected: the new cases FAIL (missing migration file, zelle unknown, old copy).
- [ ] **Step 3: Implement**
  - **Migration:**
    - drop and re-add `product_orders_paid_via_check` with the five values;
    - `alter table public.store_settings add column if not exists pickup_note text` with a named check `store_settings_pickup_note_length check (pickup_note is null or char_length(pickup_note) <= 200)`;
    - finish with `notify pgrst, 'reload schema';`.
  - **orderFlow, view and copy:** make the changes the tests describe, in both `COUNTER_METHODS` (lib and view).
- [ ] **Step 4: Run and see them pass**
  Run: `npx vitest run lib/products lib/email`, then `npx tsc --noEmit`
  Expected: PASS and no type errors. `Record<PaidVia, string>` forces the label.
- [ ] **Step 5: Commit** `feat(store): Zelle as a counter payment`

### Task 2: Pickup note setting

**Files:**
- Modify:
  - `lib/products/storeSettings.ts`
  - `app/api/admin/store-settings/pickup/route.ts`
  - `app/admin/orders/orders-view.tsx` (`PickupSettingsPanel`)
- Test: `lib/products/storeSettings.test.ts`

**Interfaces:**
- Produces:
  - `interface PickupSettings { pickupHours: string | null; pickupNote: string | null; holdDays: number }`;
  - `sanitizePickupSettings(body)`, which reads `pickup_note`;
  - `getPickupSettings(db)`, which selects `*`.

- [ ] **Step 1: Write the failing tests** in `storeSettings.test.ts`:
  - `sanitizePickupSettings({ pickup_hours: "x", pickup_note: "  Ask for Armando  ", hold_days: 3 }).pickupNote` is `"Ask for Armando"`.
  - `pickup_note` of `"   "`, `null` or a missing key gives `pickupNote: null`.
  - These throw: `pickup_note: "x".repeat(201)` throws "Keep pickup instructions to 200 characters", and `pickup_note: 5` throws "Pickup instructions must be text".
  - `getPickupSettings` reads `{ pickup_hours: "Daily 9–6", pickup_note: "Ask for Armando", hold_days: 5 }` into all three fields.
  - A row without a `pickup_note` key (migration not live) still returns `pickupHours: "Daily 9–6"` with `pickupNote: null`.
  - Update the existing `toEqual` cases to include `pickupNote: null`.
  - The fake db's `select` records its argument, and the test asserts it was called with `"*"`.
  - Route source test: it contains `pickup_note: settings.pickupNote`.
- [ ] **Step 2: Run and see them fail**
  Run: `npx vitest run lib/products/storeSettings.test.ts`
  Expected: FAIL.
- [ ] **Step 3: Implement**
  - `MAX_NOTE_LENGTH = 200`.
  - The route updates `pickup_note` along with the other two columns.
  - The form gains a `<textarea>` under the hours: label "Pickup instructions", hint "Optional. Shown under the pickup hours.", `maxLength={200}`, `rows={2}`, the same input classes as the hours field (with `py-2`, and without the fixed `h-11`). It is loaded from `s.pickupNote` and posted as `pickup_note`.
  - The hours hint stays as it is.
- [ ] **Step 4: Run and see them pass**
  Run: `npx vitest run lib/products/storeSettings.test.ts`, then `npx tsc --noEmit`
  Expected: PASS. tsc lists the callers that build a `PickupSettings`, if any; fix them.
- [ ] **Step 5: Commit** `feat(store): editable pickup instructions`

### Task 3: Show the note to customers

**Files:**
- Modify:
  - `components/products/PickupPass.tsx` (new prop `pickupNote: string | null`; render it under the hours with the `Info` lucide icon and the same row classes)
  - `app/(user)/products/success/page.tsx`
  - `app/(dashboard)/dashboard/orders/page.tsx`
  - `app/(user)/products/cart/page.tsx` (pickup box: the note as a `text-ink-muted` line after the hours)
  - `lib/email/product-order-emails.ts`:
    - replace `hoursRow` with `pickupRows(pickupHours, pickupNote)`, which returns the hours row and then `["When you arrive", text(note)]` when the note is set;
    - add `pickupNote?: string | null` next to every `pickupHours` field in the arg types.
  - Thread `pickupNote` next to `pickupHours` in:
    - `lib/products/placeOrder.ts`, `staffActions.ts` and `holds.ts`;
    - `app/api/webhook/route.ts` (one `getPickupSettings` call, both fields);
    - `app/api/products/checkout/route.ts`;
    - `app/api/admin/product-orders/action/route.ts`;
    - `app/api/cron/product-holds/route.ts`.
- Test:
  - `lib/email/product-order-emails.test.ts`
  - `lib/products/placeOrder.test.ts`, `staffActions.test.ts` and `holds.test.ts`
  - a PickupPass and cart source test

**Interfaces:**
- Consumes: `PickupSettings.pickupNote` (Task 2).
- Produces: `PickupPass` props `{ order, pickupHours, pickupNote, action?, headingLevel? }`.

- [ ] **Step 1: Write the failing tests**
  - **Emails:** for the confirmation (pickup), ready, reserved and reminder builders, `pickupNote: "Ask for Armando"` puts "When you arrive" and "Ask for Armando" in the html. `pickupNote: null` puts no "When you arrive" in the html.
  - **Delivery:** the confirmation with `fulfillmentMethod: "delivery"` and a note contains neither the hours nor the note.
  - **Escaping:** `pickupNote: "<b>Bring ID</b> & receipt"` gives html containing `&lt;b&gt;` and `&amp;`.
  - **placeOrder, staffActions and holds:** the fake email sender receives `pickupNote` equal to the deps value. Extend each file's existing "passes pickupHours" case.
  - **Source tests:**
    - `PickupPass.tsx` contains `pickupNote &&`;
    - the cart page passes or renders `pickupNote`;
    - both pass sites pass `pickupNote=`.
- [ ] **Step 2: Run and see them fail**
  Run: `npx vitest run lib/email lib/products`
  Expected: FAIL.
- [ ] **Step 3: Implement** the threading and rendering listed under Files.
- [ ] **Step 4: Run and see them pass**
  Run: `npx vitest run`, then `npx tsc --noEmit`
  Expected: the full suite passes (1271 plus the new tests) and tsc is clean.
- [ ] **Step 5: Commit** `feat(store): show pickup instructions on the pass, cart and emails`
