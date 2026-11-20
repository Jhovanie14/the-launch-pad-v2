# Home Service Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home page gets a "Three services, one location" section with real shop photos between the hero and "Why The Launch Pad?".

**Architecture:**
- The copy and photos live in `lib/marketing/homePage.ts` as `HOME_SERVICES`, pinned by tests.
- A server component, `components/home/HomeServices.tsx`, renders them.

**Tech Stack:** Next.js 16 server components, next/image, Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-home-service-photos-design.md`

## Global Constraints

- Use tokens only. Flame never appears on white except as `-mark`. Links are 44px, with a Brand Blue focus outline on white (`FOCUS_ON_LIGHT`).
- Only the three real photos named in the spec. No prices in this section. Copy is verbatim from the spec.
- CRLF. No Co-Authored-By trailer.

## Review Focus

1. **No AI or stock photo** is used anywhere on the home page. Pinned in Task 1.
2. **The detailing hours match `SHOP.hours`**, so the home page and footer can't disagree. Pinned in Task 1.
3. **The section sits between the hero and "Why".** Pinned in Task 2 (source order).
4. **Alt text describes what the photo shows,** and makes no claim about who did the work.
5. **The phone layout** has one column and no horizontal scroll. Checked by the reviewer.

---

### Task 1: Copy and photos

**Files:** Modify `lib/marketing/homePage.ts` and `lib/marketing/homePage.test.ts`.

**Produces:**
```ts
export interface HomeService {
  key: "self" | "detail" | "member";
  name: string;
  lede: string;
  facts: string[];
  photo: { src: string; alt: string };
  link: { href: string; label: string };
}
export const HOME_SERVICES: HomeService[];
```

- [ ] **Step 1: Failing tests** in `homePage.test.ts`:
  - `"services are the three approved cards"`: names, ledes, facts and links match the spec exactly.
  - `"services use only the real shop photos"`: the srcs equal the three spec photos; none is in the AI/stock list; each file exists under `public/`.
  - `"detailing hours match the footer"`: the detailing fact containing "9:30 AM–6:30 PM" appears in a `SHOP.hours` entry.
- [ ] **Step 2:** `npx vitest run lib/marketing/homePage.test.ts`. Expected: FAIL (`HOME_SERVICES` undefined).
- [ ] **Step 3:** Add `HOME_SERVICES` with the spec's copy. Alt text:
  - "A freshly washed black car in one of our self-service bays";
  - "A white sedan being foam-washed in one of our bays";
  - "The clean interior of a car in one of our bays".
- [ ] **Step 4:** Rerun the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(home): service cards copy with the real shop photos`

### Task 2: The section

**Files:**
- Create `components/home/HomeServices.tsx`.
- Modify `app/(user)/(home)/page.tsx` and `lib/marketing/homePageSource.test.ts`.

- [ ] **Step 1: Failing test** in `homePageSource.test.ts`, named `"services section sits between the hero and why"`. In `page.tsx`, the index of `<HomeServices` is after `<HomeHero` and before `<WhyLaunchPad`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Build `HomeServices`** to the spec:
  - Canvas section labelled by the h2;
  - a `<ul>` grid (`md:grid-cols-3`);
  - `SURFACE` cards with `next/image` (`fill`, 4:3, `sizes`);
  - a `bg-svc-{self|detail|member}-mark` dot;
  - `Check` icons in `text-brand-blue`;
  - a ringed `h-11` `Link` with `FOCUS_ON_LIGHT`.

  Then insert it in `page.tsx`.
- [ ] **Step 4: Checks.**
  - Tests: PASS.
  - tsc: clean.
  - Probe `GET /` on the dev server: 200, the h2 and all three photo paths present, and none of the AI ones.
- [ ] **Step 5: Commit** `feat(home): three services with real shop photos`

### Task 3: DESIGN.md, review, PR

- [ ] **Step 1:** Update the Marketing home entry in DESIGN.md: the services section, and real photos only.
- [ ] **Step 2:** Run the full suite and tsc. Commit `docs(design): home services section`.
- [ ] **Step 3:** Run the whole-branch review (opus), then one fix pass. Push and open the PR.
