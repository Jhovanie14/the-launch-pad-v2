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

## vehicles — detailed trace (why it is a larger refactor)

`vehicles` is read by plate *across ownership boundaries* in client code, so owner-only RLS breaks five flows. Each anon/cross-owner read must move to a server-side service-role call before the permissive policy can drop:

1. `hooks/useUserVehicles.ts` — subscription-linked vehicles are read via embedded join `subscription_vehicles -> vehicle:vehicles(...)`; family/null-owner vehicles would be filtered out by owner-only RLS and disappear from the list.
2. `hooks/useUserVehicles.ts` `addVehicle` — the "plate exists but `user_id IS NULL`" check returns nothing under owner-only RLS → duplicate-plate INSERT → unique-constraint error.
3. `app/(user)/(booking)/confirmation/page.tsx` & `app/(dashboard)/dashboard/booking/confirmation/page.tsx` — client-side plate/id lookup for vehicle display (guest case is anon).
4. `app/(dashboard)/dashboard/booking/action.ts` — self-serve path plate lookup uses the anon server client; unowned plates would not be found.
5. `app/api/subscription/add-vehicle/route.ts` — plate lookup.

**Two paths:**
- **Full closure (owner + admin only):** move all of the above to server-side service-role (a `lookupVehicleByPlate` server action for the confirmation pages; switch `action.ts`/`add-vehicle`/`useUserVehicles` reads to server routes). Highest privacy, but a real refactor of the vehicle data layer with regression risk on booking/subscription flows. Needs its own plan + testing.
- **Partial closure (authenticated-only):** move just the guest (anon) confirmation read server-side, then change "Vehicles are viewable by everyone" from `public` to `authenticated`. Closes anonymous plate scraping (the worst of it) with low risk; logged-in users can still read vehicles (lower-severity residual). License plates are less sensitive than the `bookings` PII already closed.

## profiles — detailed trace

The public reviews UI reads `profiles(full_name, avatar_url)` via a PostgREST embedded join and renders to anonymous visitors. Restricting `profiles` requires either (a) moving the reviews fetch to server-side service-role and passing rows as props (the carousel already takes `reviews` as a prop — locate and convert the fetch), or (b) a `public_profiles` VIEW exposing only `(id, full_name, avatar_url)` with the reviews query repointed to it. Until one is done, `profiles` SELECT cannot be restricted (it currently exposes every user's email to anon).

## Why a follow-up, not part of the main Phase 1 branch

These changes alter anonymous, guest-facing production flows (booking success, vehicle creation, public reviews). They warrant isolated implementation + manual verification on each flow before deploy, rather than being bundled with the already-verified server-side-price/auth work.
