# Marketing Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the home page onto the 24/7 Bay tokens, show each service once with live prices, and render it on the server.

**Architecture:**
- The tested copy lives in `lib/marketing/homePage.ts`.
- The page is a server component that reads `getServicesPageData()`.
- The `/services` tile grid is extracted so both pages use it.
- The only client code is the flame "Book a detail" button, because it opens the booking pop-up.

**Tech Stack:** Next.js 16 server components, Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-marketing-home-design.md`

## Global Constraints

- Use tokens only; no raw palette classes or hex.
- One flame control per screen: "Book a detail" in the hero. Review stars may use the flame colour; they are not controls.
- Targets are 44px. The focus outline is Flame on navy and Brand Blue on white.
- Copy is exact, as in the spec. Files use CRLF. No Co-Authored-By trailer.

## Review Focus

1. **No unverified claims anywhere on the page.** None of "4.9", "500+", "4.4", "Best price" or "guarantee". Pinned by a source test in Task 1.
2. **Prices match `/services`.** Both pages use the same grid and model. Task 2 shares the code, and Task 4 compares the two pages on the dev server.
3. **The home page renders on the server.** `page.tsx` has no `"use client"`. Pinned in Task 1.
4. **A price is missing** (a failed query, so `detailingFrom` or `membershipFrom` is null). The tile shows no price and does not break. The shared grid already behaves this way; Task 2 keeps it.
5. **Signed-in visitors.** The page works for them now that the middleware lets them in. The stale middleware comment is removed in Task 3.

---

### Task 1: Home copy and guard tests

**Files:** Create `lib/marketing/homePage.ts`, `lib/marketing/homePage.test.ts` and `lib/marketing/homePageSource.test.ts`.

**Produces:**
```ts
export const HOME_REASONS: { title: string; detail: string }[];
export interface HomeReview { text: string; author: string; vehicle: string; source: "Google" | "Yelp" }
export const HOME_REVIEWS: HomeReview[]; // Ahmed S., Maria G., Jason T., with the existing text, vehicle and source
```

- [ ] **Step 1: Failing tests.**
  - `homePage.test.ts`:
    - `"reasons are the four approved facts"` (exact pairs from the spec)
    - `"three reviews, one per service line"` (exact authors)
  - `homePageSource.test.ts` reads `app/(user)/(home)/page.tsx` and every file in `components/home/`:
    - `"no unverified claims"` (none of the strings in Review Focus 1)
    - `"no raw palette classes"` (regex `-(slate|blue|amber|violet|emerald|gray)-\d`)
    - `"the page is a server component"` (no `"use client"` in `page.tsx`)
- [ ] **Step 2:** Run them and expect FAIL.
- [ ] **Step 3:** Implement `homePage.ts`. The source tests stay red until Task 3. Ledger that.
- [ ] **Step 4:** Commit: `feat(home): approved home copy with guard tests`.

### Task 2: Shared service tile grid

**Files:** Create `components/services/ServiceTileGrid.tsx`, which exports `ServiceTileGrid({ model, menuHref }: { model: ServicesPageModel; menuHref: string })` and renders the `<ul>` of three tiles. Change `ServiceTiles.tsx` to render `<ServiceTileGrid model={model} menuHref="#menu" />`.

- [ ] **Step 1:** Move the grid. **Step 2:** Run tsc, and check that `GET /services` returns 200 with the same tile text. **Step 3:** Commit: `refactor(services): share the service tile grid`.

### Task 3: The home page

**Files:**
- Create `components/home/{HomeHero,BookDetailButton,WhyLaunchPad,CustomerReviews}.tsx`. Only `BookDetailButton` is `"use client"`; it uses `FLAME_BUTTON` and `openBookingModal`.
- Rewrite `app/(user)/(home)/page.tsx` as an async server component with `export const dynamic = "force-dynamic"`.
- Delete `components/user/{hero,customers,service-modal}.tsx`.

- [ ] **Step 1:** Build the page to the spec.
- [ ] **Step 2:** Run `npx vitest run lib/marketing` and expect PASS, including the Task 1 source tests. Run tsc and eslint, and expect them clean.
- [ ] **Step 3: Probe.** `GET /` returns 200. The HTML contains "Your car deserves better.", "What customers say" and the same "From $…" detailing price as `/services`. It does not contain "500+".
- [ ] **Step 4:** Commit: `feat(home): home page in the 24/7 Bay look, rendered on the server`.

### Task 4: DESIGN.md, review, PR

- [ ] **Step 1: DESIGN.md.**
  - Rewrite the "Marketing hero" entry for the new page.
  - Remove the Legacy Amber line and the two home items under Divergences.
  - Drop "the marketing site below the hero" from Legacy Navy.
- [ ] **Step 2:** Run the full suite and tsc.
- [ ] **Step 3:** Commit. Run the whole-branch review, then push and open the PR.
