# Reviews Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/reviews` shows the nine real Google reviews, word for word, in the 24/7 Bay look, rendered on the server, with no rating claims.

**Architecture:**
- One tested list in `lib/marketing/reviews.ts` feeds `/reviews` and the home page.
- The page is a server component.
- The only client code is the shared `BookDetailButton`.

**Tech Stack:** Next.js 16 server components, Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-reviews-page-design.md`

## Global Constraints

- Use tokens only. One flame control ("Book a detail"); the stars are a tint, not a control.
- Targets are 44px. The focus outline is Flame on navy and Brand Blue on white.
- Review text is verbatim from the screenshots. CRLF. No Co-Authored-By trailer.

## Review Focus

1. **Every quote matches its screenshot exactly,** and none is invented. Pinned by exact-text tests in Task 1; the reviewer compares the images.
2. **The duplicate screenshot** (`image19` is `image13`) appears once. Pinned in Task 1 (unique texts, nine reviews).
3. **No rating claim** in the page, layout or metadata. Pinned in Task 2.
4. **The home page's three reviews stay the same.** Pinned by the existing home test.
5. **The review link opens in a new tab safely,** and the booking emails still use the same URL. Checked in Task 2.

---

### Task 1: One review list

**Files:**
- Create `lib/marketing/reviews.ts` and its `.test.ts`.
- Modify `lib/marketing/homePage.ts`, so `HOME_REVIEWS` is picked from `GOOGLE_REVIEWS`.
- Modify `lib/email/booking-emails.ts` to import `GOOGLE_REVIEW_URL`.

**Produces:**
```ts
export interface GoogleReview { text: string; author: string; source: "Google" }
export const GOOGLE_REVIEWS: GoogleReview[]; // nine, in screenshot order 10–18
export const GOOGLE_REVIEW_URL = "https://g.page/r/CZw2a77VbVUUEBM/review";
```
`HomeReview` stays as an alias of `GoogleReview`.

- [ ] **Step 1: Failing tests.**
  - `"nine real reviews in screenshot order"` checks the exact authors.
  - `"quotes are word for word"` checks the exact text for Emi S. and Kanzah N.
  - `"no duplicate quotes"`
  - `"the review link is the Google listing"`
- [ ] **Step 2:** Run the tests and expect FAIL. **Step 3:** Implement. **Step 4:** Run `npx vitest run lib/marketing lib/email`, including the home tests, and expect PASS.
- [ ] **Step 5: Commit** `feat(reviews): the real Google reviews in one tested list`

### Task 2: The page

**Files:**
- Rewrite `app/(user)/reviews/page.tsx` as a server component.
- Modify `app/(user)/reviews/layout.tsx`: the description and the stale comment.
- Create `lib/marketing/reviewsPageSource.test.ts`.

- [ ] **Step 1: Failing guard test.** `reviewsPageSource.test.ts` covers:
  - no claims in `page.tsx` or `layout.tsx` (case-insensitive);
  - no raw palette classes;
  - no `"use client"`.

  Run it and expect FAIL: today's page is a client component with blue classes, and the layout says "4.9".
- [ ] **Step 2: Build the page** to the spec and update the layout.
- [ ] **Step 3: Checks.**
  - Tests: PASS.
  - tsc and eslint: clean.
  - Probe `GET /reviews`: 200, all nine names present, no "Ahmed S.", no "4.9".
  - The meta description is the new one.
- [ ] **Step 4: Commit** `feat(reviews): real Google reviews page in the 24/7 Bay look`

### Task 3: DESIGN.md, review, PR

- [ ] **Step 1:** In DESIGN.md, add a Reviews page entry beside the Marketing home entry.
- [ ] **Step 2:** Run the full suite and tsc.
- [ ] **Step 3: Commit,** run the whole-branch review, then push and open the PR.
