# Catalog Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `/products` and the product pages to the 24/7 Bay look:
- keep the editable hero, on white, with a smooth scroll;
- show short display names and parsed specs;
- put "Add to cart" near the top of the product page;
- retire the `.storefront` world.

**Architecture:**
- Pure helpers in `lib/products/describe.ts` (title, specs, meta), with tests.
- The existing components are restyled in place.
- A small client `BuyBox` handles quantity and add-to-cart on the product page.
- A migration adds `display_name`.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 tokens, Vitest (no DOM, so components get source tests).

**Spec:** `docs/superpowers/specs/2026-11-24-catalog-redesign-design.md`

## Global Constraints
- Tokens only (no gold, no raw palette, no `font-display` and no Anton once Task 5 is done).
- One Flame control per screen: the hero CTA on the list, "Add to cart" on the product page.
- 44px targets; `FOCUS_ON_LIGHT` on white and `FOCUS_ON_NIGHT` on Night; no eyebrows above headings; no emoji rendered.
- JSON-LD and SEO metadata unchanged (the full `name`).
- Migrations are written, never applied. CRLF. No Co-Authored-By.

## Review Focus
1. **A description with no `Label: value` lines:** all paragraphs and no Specs block. Pinned in Task 1.
2. **A description that is only emoji or empty lines:** no empty paragraphs. Pinned in Task 1.
3. **`display_name` null or blank:** fall back to `name`. Pinned in Task 1.
4. **Sold-out products:** the add button is disabled everywhere and the Flame bar says "Sold out". Pinned in Tasks 3 and 4 (source tests).
5. **Reduced motion:** the hero scroll uses `auto`. Pinned in Task 2 (source test for `prefers-reduced-motion`).

---

### Task 1: Helpers and migration
**Files:**
- Create: `lib/products/describe.ts`, `lib/products/describe.test.ts`, `supabase/migrations/20261124010000_product_display_name.sql`
- Modify: `types/database.types.ts` (add `products.display_name`)

**Produces:**
```ts
export function productTitle(p: { name: string; display_name?: string | null }): string;
export function parseDescription(text: string | null): { about: string[]; specs: { label: string; value: string }[] };
export function cardMeta(text: string | null): string | null; // Size and Weight values joined " · ", else null
```

- [ ] **Step 1: Failing tests:**
  - `productTitle`: falls back when null or blank, and trims.
  - `parseDescription`, on the real utility-towel text: strips emoji and the "✨ … ✨" decorations; Size/Weight/Quantity become specs; the rest become paragraphs; no empty paragraphs. Also: emoji-only lines are dropped, and text with no labels gives empty specs.
  - `cardMeta`: "300GSM · 15.75 × 15.75 inches"-style output for Size and Weight; null when neither is present.
  - Migration source test: it contains `add column if not exists display_name text` and a length check of `<= 60`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): display names and readable product descriptions`

### Task 2: Hero on white, and the list page
**Files:**
- Modify: `components/products/storefront-hero.tsx`, `app/(user)/products/page.tsx`
- Create: `lib/products/catalogSource.test.ts`

- [ ] **Step 1: Failing source tests:**
  - **Hero:** no `font-display`, `text-gold`, `uppercase` or eyebrow text; contains `scrollIntoView`, `prefers-reduced-motion` and `ProductVideo`.
  - **Page:** no `STOREFRONT_CLASS`; has `bg-canvas`; the empty state reads "No products right now".
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Build** to the spec. The facts use `getPickupSettings` for `holdDays`.
- [ ] **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): the hero on white, scrolling smoothly to the range`

### Task 3: Cards, buttons, filters, featured
**Files:** Modify `components/products/product-card.tsx`, `product-actions.tsx`, `product-catalog.tsx`, `featured-product.tsx`; extend `catalogSource.test.ts`.

- [ ] **Step 1: Failing source tests:**
  - the card uses `productTitle(` and `cardMeta(`, `object-contain` and `line-clamp-2`, with no motion import;
  - `AddToCartButton` has the `aria-label` "Add … to cart", a disabled sold-out state and `size-11`/`h-11`;
  - all four files: tokens only, no `gold`, no `font-display`, no `rounded-none`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Build.** **Step 4: Run, expect PASS.** **Step 5: Commit:** `feat(store): white product cards with short names`

### Task 4: Product page
**Files:**
- Modify: `app/(user)/products/[slug]/page.tsx`, `components/products/product-gallery.tsx`
- Create: `components/products/BuyBox.tsx` (client: stepper + Flame add + the sticky phone bar)
- Extend: `catalogSource.test.ts`

- [ ] **Step 1: Failing source tests:**
  - the page uses `productTitle(`, `parseDescription(`, `BuyBox`, `getPickupSettings(`, "About this product", "Specs" and "More products", with no `STOREFRONT_CLASS`;
  - `BuyBox` has a `sticky`/`fixed` bottom bar with `lg:hidden`, the `FLAME_BUTTON` add, "Sold out", and the stepper `size-11`;
  - tokens only.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Build.** **Step 4: Run tests and tsc, expect PASS.** **Step 5: Commit:** `feat(store): product page with add to cart up front`

### Task 5: Retire the storefront world, and docs
**Files:**
- Delete: `app/(user)/products/storefrontFont.ts`
- Modify: `app/globals.css` (remove `.storefront`, the gold tokens and `.font-display` if unused), `lib/products/cartSource.test.ts` (the layout test), `DESIGN.md`, `PRODUCT.md` if needed
- Extend: `catalogSource.test.ts` ("no storefront anywhere")

- [ ] **Step 1: Failing test:** no file under `app/` or `components/` contains `STOREFRONT_CLASS`, `storefrontFont`, `font-display` or `text-gold`, and `globals.css` has no `.storefront {`.
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Remove** them, and update the docs. **Step 4: Run the full suite, tsc and eslint; expect green.** **Step 5: Commit:** `refactor(store): retire the black-and-gold storefront`
