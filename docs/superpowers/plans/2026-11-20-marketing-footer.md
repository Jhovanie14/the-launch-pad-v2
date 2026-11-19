# Marketing Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public footer becomes the navy navbar's sibling on the tokens, keeping its links and fixing the Detailing link and the year.

**Architecture:** A tested `lib/marketing/footer.ts` holds the link groups, contact facts and copyright line. `components/user/footer.tsx` stays a server component and renders them.

**Tech Stack:** Next.js 16 server components, Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-marketing-footer-design.md`

## Global Constraints

- Tokens only, with no raw palette classes or hex. No flame control. 44px targets on phones and the Flame focus outline on navy.
- The copy is exact, as in the spec. CRLF. No Co-Authored-By trailer.

## Review Focus

1. **Detailing** goes to `/services`, not the blog post. Pinned in Task 1.
2. **The year** comes from the date, not hard-coded. Pinned in Task 1.
3. **Every internal link** starts with "/" and points at a page that exists. Task 1 pins the hrefs; Task 2 probes them.
4. **External links** (Maps, socials) open in a new tab with `rel="noopener noreferrer"`. Checked in Task 2.
5. **A phone-width layout** with no horizontal scroll. Checked on the preview.

---

### Task 1: Footer content

**Files:** Create `lib/marketing/footer.ts` and its `.test.ts`.

**Produces:**
```ts
export interface FooterLink { name: string; href: string }
export const FOOTER_GROUPS: { title: string; links: FooterLink[] }[]; // "Services", "The Launch Pad"
export const SHOP: { address: string; mapsUrl: string; phoneDisplay: string; phoneHref: string; email: string; hours: string[] };
export const LEGAL_LINKS: FooterLink[];
export function copyrightLine(now: Date): string; // "© 2027 The Launch Pad. All rights reserved."
```

- [ ] **Step 1: Failing tests.**
  - `"services: Detailing goes to /services"`: the exact Services list.
  - `"the launch pad group in order"`
  - `"hours and contact copy"`: the exact hours lines, and `phoneHref` is `tel:+18322198320`.
  - `"copyright uses the given year"`: 2027.
  - `"internal links start with /"`
- [ ] **Step 2:** Run and expect FAIL. **Step 3:** Implement. **Step 4:** Run and expect PASS. **Step 5: Commit** `feat(footer): footer content in one tested place`

### Task 2: The footer

**Files:** Modify `components/user/footer.tsx`.

- [ ] **Step 1: Build it to the spec** from Task 1's exports, as a server component.
- [ ] **Step 2: Checks.**
  - `npx tsc --noEmit -p .` and `npx eslint components/user lib/marketing` are clean.
  - The palette grep on `footer.tsx` finds nothing, and neither does `rg -n "Tooltip|#2c3e50|Tap to Call" components/user/footer.tsx`.
- [ ] **Step 3: Probe.** `GET /` contains "Detailing: Thu–Sun" and the current year, and every footer href returns 200.
- [ ] **Step 4: Commit** `feat(footer): navy footer in the 24/7 Bay look`

### Task 3: DESIGN.md, review, PR

- [ ] **Step 1:** DESIGN.md: add a Public footer entry next to the Public navbar entry, and drop "the footer" from Divergences.
- [ ] **Step 2:** Run the full tests and tsc. **Step 3: Commit,** then the whole-branch review, then push and open the PR.
