# RLS Tightening — Trace Findings & Remediation Plan (Phase 1 follow-up)

**Date:** 2026-06-11
**Status:** Traced; remediation not yet applied (touches live guest flows — needs testing)
**Related:** `supabase/migrations/20260611010000_rls_tighten.sql` (SAFE section applied separately; REVIEW section pending this plan)

## Problem

Several tables have permissive `using (true)` policies that defeat RLS; the anon key is public in the browser, so these are world-readable/writable via the Supabase REST API. The SAFE fixes (subscription_plans write, contacts read, fleet_invoices read) are low-risk and shipped in the migration above. This document covers the RISKY tables, which require app changes before their permissive policies can be dropped.

## Trace results (anon key vs service-role)

| Flow | File | Client | Table | Effect of tightening |
|---|---|---|---|---|
| Guest booking success | `app/(user)/(booking)/success/page.tsx` | **anon (browser client)** | `bookings` (by `payment_intent_id`, guest) | **BREAKS** — guest has no `auth.uid()`. Must switch to service-role. |
| Vehicle ensure/lookup | `utils/vehicle.ts` (`ensureVehicle`) | **anon (server client)** | `vehicles` (by plate, guest) | **BREAKS** for guests. Must switch to service-role. |
| Admin booking list | `app/admin/booking/booking-view.tsx` | anon, authenticated admin | `bookings` | OK once an admin-select policy exists. |
| Self-service sub | `hooks/useSelfServiceSubscription.ts` | anon, authenticated owner | `self_service_subscriptions` | OK (owner policy exists); admin needs a policy. |
| Public reviews | reviews UI | anon | `profiles` (name/avatar of reviewer) | **BREAKS** for anon visitors. Needs a limited public view. |

## Remediation steps (in order)

1. **Switch guest/server reads to the service-role client** so they don't depend on permissive RLS:
   - `app/(user)/(booking)/success/page.tsx`: read the booking via `createAdminClient()` (server-only) instead of `@/utils/supabase/client`. Verify `app/(dashboard)/dashboard/bookings/success/page.tsx` similarly.
   - `utils/vehicle.ts` (`ensureVehicle`): use `createAdminClient()` for the plate SELECT/INSERT (it already runs server-side; this is the correct trust level since it's called from trusted server actions/routes).
   - Audit the booking confirmation pages' vehicle-info read; route guest reads through the server/service-role.

2. **Add admin-select policies** (so admin pages keep working via the authenticated anon key):
   - `bookings`: `Admins can select all bookings` (role = admin).
   - `vehicles`: `Admins can select all vehicles` + `Users can select own vehicles`.
   - `self_service_subscriptions`: `Admins can read self service subscriptions`.
   (SQL is staged, commented, in the migration file.)

3. **profiles — replace blanket read with a limited public view.** Create a view exposing only `(id, full_name, avatar_url)` for the public reviews display, point the reviews query at it, then restrict `profiles` SELECT to own + admin. RLS is row-level, not column-level, so a view is the clean way to expose only safe columns.

4. **Drop the permissive policies** (uncomment the REVIEW section of the migration) — only after steps 1–3.

5. **Test end-to-end before deploying:**
   - Guest booking → success page still loads the order.
   - Guest plate lookup still creates/links a vehicle.
   - Public reviews carousel still shows reviewer names/avatars to a logged-out visitor.
   - Admin booking/subscription lists still load.
   - A logged-in user can still see their own bookings/vehicles/subscription, but NOT another user's (verify via the REST API with a non-admin token).

## Why a follow-up, not part of the main Phase 1 branch

These changes alter anonymous, guest-facing production flows (booking success, vehicle creation, public reviews). They warrant isolated implementation + manual verification on each flow before deploy, rather than being bundled with the already-verified server-side-price/auth work.
