# Services Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/services` renders on the server in the 24/7 Bay look, and every price and claim on it comes from real data.

**Architecture:** A pure `lib/` function turns service and plan rows into the page model: categories, sale prices, "from" prices and the cheapest plan. It is tested. A small server loader feeds it, and the page becomes a server component built from a few presentational pieces. The marketing navbar, the footer and `app/(user)/services/layout.tsx` (metadata) stay untouched.

**Tech Stack:** Next.js 16 App Router (server components), Supabase server client (public tables `service_packages`, `subscription_plans`), Tailwind v4 tokens, lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-services-page-redesign-design.md`

## Global Constraints

- Branch `feat/services-page-redesign`, from `main`.
- Tokens only. No `gray-*`, `slate-*`, `blue-*`, `purple-*`, `green-*`, `yellow-*`, `red-*` or `amber-*` classes in touched files.
- One flame button on the page ("Book a detail").
- Service hue as text and icon only (sky / flame / svc-member), never as fills.
- No animation that starts content hidden. The card hover lift is `motion-safe:` only.
- Copy is exactly as in the spec. Sentence case, no exclamation marks, no emoji. The phone number is (832) 219-8320.
- CRLF. Edit existing files with the Edit tool. For new files, after `Write` run `node -e "const f=process.argv[1],fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))" <file>`.
- Only read-only GETs, against `http://localhost:3000` (the user's dev server). No Co-Authored-By trailer.

## Review Focus

1. **Sale switched off** (`HOLIDAY_SALE_ACTIVE` false). There is no sale line, no struck-through prices, and the "From" price is the list price. Pinned in Task 1 through the `saleActive` input.
2. **Only commercial plans, or no plans.** The membership tile shows no price. It never shows a commercial plan as "From". Pinned in Task 1.
3. **No active services.** The page shows the empty-state card with the phone link, and the detailing tile has no "From" price. Pinned in Task 1.
4. **A new category the code doesn't know.** It still appears, after the two known ones, under its own name. Pinned in Task 1.
5. **Search engines.** The server HTML contains the service names, the prices and the tile prices. Checked in Task 3 step 3.

---

### Task 1: The page model

**Files:**
- Create: `lib/marketing/servicesPage.ts`
- Test: `lib/marketing/servicesPage.test.ts`

**Interfaces:**
- Produces:

```ts
export interface MenuItem { id: string; name: string; duration: number; features: string[]; price: number; salePrice: number | null } // salePrice null when no sale
export interface MenuCategory { key: string; label: string; minDuration: number; maxDuration: number; items: MenuItem[] }
export interface ServicesPageModel {
  categories: MenuCategory[];            // "quick service", "express detail" first (in that order), then others by first appearance
  detailingFrom: number | null;          // lowest price shown on the menu (sale price when on sale)
  membershipFrom: { price: number; planName: string } | null; // cheapest NON-commercial plan's monthly_price
  sale: { active: boolean; percent: number };
}
export function buildServicesPage(input: {
  services: { id: string; name: string; duration: number; price: number | string; features: string[] | null; category: string | null }[];
  plans: { name: string; monthly_price: number | string; is_commercial: boolean | null }[];
  saleActive: boolean;
  saleDiscount: number;                  // 0.05
}): ServicesPageModel
```

- The label is the category in sentence case: "quick service" becomes "Quick service". The sale price is `Math.round(price * (1 - saleDiscount) * 100) / 100`. Commercial plans are detected with `isCommercialPlan` (`lib/pricing/flockPricing.ts`).

- [ ] **Step 1: Write the failing tests.** Use the real catalog: Quick Exterior 25/15m, Quick Interior 25/15m and Classic 45/30m (quick service); Express Exterior 40/20m, Express Interior 40/25m and Express Complete 65/45m (express detail). Plans: Quick Service 39.99, Express Detail 59.99, Commercial Wash 89.99 (`is_commercial` true).
  - `"orders quick service then express detail, with sentence-case labels and duration ranges"`: gives labels `["Quick service", "Express detail"]`, quick `minDuration 15`, `maxDuration 30`.
  - `"sale on → sale prices and detailingFrom 23.75"`: Quick Exterior has `salePrice 23.75` and `price 25`.
  - `"sale off → no sale prices, detailingFrom 25"`: every `salePrice` is null.
  - `"membershipFrom is the cheapest non-commercial plan"`: `{ price: 39.99, planName: "Quick Service" }`.
  - `"only commercial plans → membershipFrom null"`
  - `"no services → no categories and detailingFrom null"`
  - `"an unknown category follows the known ones under its own name"`: a `"ceramic"` service gives a last category labelled `"Ceramic"`.
  - `"null features → []"`
- [ ] **Step 2: Run, expect FAIL** with `npx vitest run lib/marketing/servicesPage.test.ts`.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** `feat(services): page model with real prices and the cheapest plan`

---

### Task 2: Server loader

**Files:**
- Create: `lib/marketing/servicesPageData.ts`

**Interfaces:**
- Consumes: `buildServicesPage` (Task 1); `HOLIDAY_SALE_ACTIVE` and `HOLIDAY_SALE_DISCOUNT` (`lib/booking/holidaySale.ts`).
- Produces: `getServicesPageData(): Promise<ServicesPageModel>`.
  - It runs on the server only, with `createClient()` from `@/utils/supabase/server`.
  - It reads active `service_packages` (`is_active = true`, ordered by `created_at`) and `subscription_plans` (`name, monthly_price, is_commercial`).
  - A query error is treated as an empty list for that table, so the page still renders (an empty state, or no membership price).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `npx tsc --noEmit -p .`. Expect no output.
- [ ] **Step 3: Commit** `feat(services): server loader for the services page`

---

### Task 3: The page

**Files:**
- Modify: `app/(user)/services/page.tsx`. This is a full rewrite as a server component: no `"use client"`, `export const dynamic = "force-dynamic"` so prices are fresh on every request, as the spec requires.
- Create: `components/services/ServiceTiles.tsx` (the navy top section) and `components/services/ServiceMenu.tsx` (the sale line, the categories and cards, the extras note and the empty state). Both are server components.

**Interfaces:**
- Consumes: `getServicesPageData` (Task 2); `ServicesPageModel` (Task 1); `BAY_MINIMUM_CASH`, `BAY_MINIMUM_CARD` and `usd` (`lib/pricing/selfServiceRates.ts`).
- Produces: `ServiceTiles({ model }: { model: ServicesPageModel })` and `ServiceMenu({ model }: { model: ServicesPageModel })`.

- [ ] **Step 1: Build to the spec's "Decisions".**
  - **Navy top section:** title, intro and three tiles.
    - Self-service: Droplets in `text-svc-self`. "$3 coins · $5 tap-to-pay". Link "How the bays work" to `/self-service`.
    - Detailing: Sparkles in `text-flame`. `From ${detailingFrom}`, omitted when null. Link "See the menu" to `#menu`.
    - Membership: Star in `text-svc-member`. `From ${price} a month · {planName} plan`, omitted when null. Link "See plans" to `/pricing`.
    - The flame "Book a detail" goes to `/service`.
  - **Menu:**
    - Sale line when `sale.active`.
    - `<section id="menu">`, then one block per category: an h2 with the label, the duration range ("15 to 30 min", or "15 min" when equal), and a grid of cards (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`).
    - Each card shows the features (Check in Brand Blue; features starting "No" get a Minus in Ink Subtle), the price (sale price in 900 with the original in `<s>`), and a ring "Book this" link to `/service?service={id}`.
    - The extras line.
    - The empty-state card with `<a href="tel:8322198320">`.
  - **Remove:** the old motion variants, the hard-coded `mainServiceCategories`, the `popularServices` badge logic and the "Detailed Pricing by Vehicle Type" block.
  - **Headings:** the page `<h1>` is "Our services", in the navy section.
- [ ] **Step 2: Static checks.** Run `npx tsc --noEmit -p .`, `npx eslint "app/(user)/services" components/services lib/marketing`, and the palette grep over those paths. Expect no tsc output, 0 errors and no matches.
- [ ] **Step 3: Server HTML probe** `GET http://localhost:3000/services`.
  - Expect 200.
  - Present: "Our services", "Quick Exterior Wash", "Express Complete Detail", a sale price "23.75", "Quick Service plan", "How the bays work", and `id="menu"`.
  - Absent: "Basic $39.99", "Priority scheduling", "Vehicle Type", "15% off all detailing".
  - Allow for React's `<!-- -->` text splits in the patterns.
- [ ] **Step 4: Commit** `feat(services): server-rendered services page in the 24/7 Bay look`

---

### Task 4: DESIGN.md, full checks, PR

**Files:**
- Modify: `DESIGN.md`. In Divergences, the marketing site line notes that `/services` is now on the tokens: a navy top with three service tiles tinted by service, and a menu of white cards, under the unchanged marketing navbar.

- [ ] **Step 1: Edit `DESIGN.md`.**
- [ ] **Step 2: Full checks.** Run `npx vitest run`, `npx tsc --noEmit -p .` and `npx eslint lib app components`. Expect all tests to pass, no tsc output, and no new warnings.
- [ ] **Step 3: Commit** `docs(design): services page`, then push and open the PR to `main` (after the whole-branch review). The PR body lists the preview checks:
  - the tile prices match the menu and the plans;
  - "Book this" opens booking with that package picked;
  - the page works at phone width;
  - "view source" shows the services.
