# Admin Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/products`:
- a stock-first list with fast "Receive stock";
- a sectioned edit drawer with the short-name field;
- the storefront hero editor on its own tab;
- everything on the brand tokens.

**Architecture:**
- Pure helpers (`lib/admin/productForm.ts`, `lib/admin/productsList.ts`), tested.
- `products-view.tsx` becomes a container: data, tabs, the drawer state.
- `components/admin/products/ProductsList.tsx` and `ProductDrawer.tsx` render it.

**Tech Stack:** Next.js 16, React 19, Supabase browser client (admin RLS), shadcn Sheet/Popover/Switch/AlertDialog/Tabs, Tailwind v4 tokens, Vitest (no DOM).

**Spec:** `docs/superpowers/specs/2026-11-24-admin-products-design.md`

## Global Constraints
- Tokens only, `lp-theme`, 44px targets, Brand Blue focus on white, labelled buttons.
- Keep `uniqueSlug` on create and the 23505 message; never change the slug on edit.
- Keep the upload behaviour: `rejectImage`, `rejectVideo`, `uploadProductMedia`, the gallery batch at concurrency 3 with progress, the failure messages.
- CRLF. No Co-Authored-By. No migrations (`display_name` exists from PR #40).

## Review Focus
1. **Receiving stock while another admin changed it:** the guarded update finds no row, so toast plus reload. Pinned in Task 2 and Task 4.
2. **Bad stock input** (0, negative, decimals, empty, over 100000): refused. Pinned in Task 2.
3. **A blank short name** saves null; over 60 characters is refused. Pinned in Task 1.
4. **Closing a dirty drawer** asks first; a clean one closes straight away. Pinned in Tasks 1 and 3.
5. **The Storefront tab** still renders `StorefrontHeroSettings`. Pinned in Task 4.

---

### Task 1: Product form helpers
**Files:** `lib/admin/productForm.ts`, `lib/admin/productForm.test.ts`.

**Produces:**
- `ProductForm`, `EMPTY_FORM`
- `formFromProduct(p)`
- `buildProductPayload(f, now)`, which returns `{ ok: true, payload } | { ok: false, error }`
- `isDirty(f, initial)`

**Tests:** the current validation messages, the short-name rules, the field mapping, the round-trip, dirtiness. Commit `feat(admin): product form rules, with the short name`.

### Task 2: List helpers
**Files:** `lib/admin/productsList.ts`, `lib/admin/productsList.test.ts`.

**Produces:**
- `ProductChip`
- `needsList`, `matchesChip`, `chipCounts`, `matchesProductSearch`
- `parseStockInput(raw, mode)`, `receivePatch(current, value, mode)`

**Tests:** the chip rules, counts, search, needs (including the short-name rule) and the stock input bounds. Commit `feat(admin): product list filters and stock maths`.

### Task 3: Edit drawer
**Files:** `components/admin/products/ProductDrawer.tsx` (takes the uploads code from `products-view.tsx`), `lib/admin/productsSource.test.ts`.

**Source tests:** the helpers are used; the section copy; "Discard your changes?"; `datalist`; tokens only. Commit `feat(admin): sectioned product drawer`.

### Task 4: List, container, tabs
**Files:** `components/admin/products/ProductsList.tsx`, a rewrite of `app/admin/products/products-view.tsx`, `page.tsx` (bg-canvas), delete `components/admin/product-stats.tsx`.

**Source tests:**
- the list helpers and `.eq("stock"` are used;
- "Receive", "Set exact count" and the Delete AlertDialog copy are present;
- no `window.confirm`;
- the switch has an `aria-label`;
- the container renders Tabs, "Storefront" and `StorefrontHeroSettings`;
- `ProductStats` is gone;
- no raw palette classes.

Commit `feat(admin): stock-first products list with storefront tab`.

### Task 5: Docs
DESIGN.md: an "Admin products" entry. Commit `docs(design): admin products`.
