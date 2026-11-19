# Booking steps load on the server (design)

Date: 2026-11-19. Status: approved by the user.

## Intent

Booking should feel fast. Today every booking step opens empty, waits for the
page's JavaScript, and only then fetches its data. The steps should open with
their content already there.

Scope: the guest steps `/service`, `/datetime`, `/confirmation`
(`app/(user)/(booking)/`) and the same three under `/dashboard/booking`.
Both trees mount the shared components in `components/booking/`.

## What is slow today

- All six `page.tsx` files are client components (`"use client"`).
- `useBookingFlow` fetches the service catalog (service step) and the chosen
  service and add-ons (every step) after hydration.
- `useBookingAuthContext` waits on `useAuth` then `useSubscription`. That is
  sign-in, then profile, then membership, one after another. The confirmation
  button shows "Loading your booking..." until all of it is in.
- **Bug:** when auth finishes, `useSubscription` still has `loading = false`
  from the signed-out pass until its effect runs, so `ready` is briefly true
  with no membership. A member can see "Proceed to Payment" for a moment.

## Goals

- Each step's first render already has its data: sign-in, membership,
  chosen service and add-ons, the catalog (service step) and the car details
  (confirmation step).
- `ready` is true from the first render when the server has the data, so the
  flash is gone.
- Moving between steps shows a loading state at once.

## Non-goals

- No change to pricing, promo codes, payment or submit. The server still
  re-checks everything on submit (`createBooking`, `/api/checkout_sessions`).
- No change to how steps look, except the loading state.
- No change to the auth context used by the rest of the app.

## Anti-goals

- A member must never be offered payment for a wash that is free.
- No stale prices: an admin price change shows on the next visit.
- No data a visitor could not already read: guests get only the public
  catalog. Membership and car details come only for the signed-in user.

## Approaches

1. **Server pages pass initial data to the existing client steps (picked).**
   Each `page.tsx` becomes a server component. It reads `searchParams`, loads
   everything in parallel with the server Supabase client, and passes it as
   props. The hooks start from that data and skip their own fetches.
2. **Cache Components with `"use cache"` for the catalog.** Needs
   `cacheComponents: true` for the whole app, which changes how every page
   renders. Too wide for this job. Rejected.
3. **Keep fetching in the browser, just in parallel.** Still waits for the
   JavaScript to load before anything starts. Rejected.

## Design decisions

- **Catalog:** read fresh on every request (two small queries on the server),
  no cross-request cache.
- **Membership:** loaded on the server with the existing
  `getActiveSubscription(client, userId)`, same shape as the browser hook.
- **Car details:** the existing `getVehicleDisplay` rules (own or membership
  car gets details, otherwise just the plate) apply on the server too.
- **Hooks:** `useBookingFlow` and `useBookingAuthContext` take optional
  initial data. With it they start ready and do not refetch. Without it they
  behave as today.
- **Loading:** a `loading.tsx` for each step in both trees.

## Left to the builder

- How the server reads the user (`getUser` vs `getClaims`) and whether the
  middleware already did the work.
- Whether the client auth context can later change the user mid-flow (sign
  out in another tab) and how the step reacts.
- What happens when the URL changes on the same step without a server render
  (the service step syncs its selection from the URL).
- Test coverage: logic for loading initial data lives in `lib/` so Vitest
  can run it (Vitest only runs `lib/**/*.test.ts`).
