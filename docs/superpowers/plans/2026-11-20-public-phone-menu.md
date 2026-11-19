# Public Phone Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public bar's phone menu becomes the dashboard phone menu's navy sibling, and it is aware of sign-in.

**Architecture:** A tested `publicPhoneMenu` function decides the link groups. A shared `SheetLink` row component (extracted from `AuthNavbar`) renders them. The `UserNavbar` sheet is rebuilt on the same tokens.

**Tech Stack:** Next.js 16, React 19, shadcn Sheet, Tailwind tokens, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-public-phone-menu-design.md`

## Global Constraints

- One flame control in the sheet ("Book a detail"). Tokens only in `navbar.tsx` once the old sheet is gone. 48px rows, 44px close button, 2px Flame focus outline.
- The copy is exact, as in the spec. CRLF. No Co-Authored-By trailer.

## Review Focus

1. **Signed out:** no Account group, and "Sign in" in the footer. Pinned in Task 1.
2. **Signed in:** the Account group shows, "Sign out" is in the footer, and "Login" appears nowhere. Pinned in Task 1, with the footer checked in Task 3.
3. **Empty cart:** no Cart row. Pinned in Task 1.
4. **Tapping a row** closes the sheet. Checked in Task 3 (each row calls `onNavigate`).
5. **On a More page:** that row is current. Comes from `isNavActive`, which Task 1 reuses.

---

### Task 1: `publicPhoneMenu`

**Files:** Create `lib/navigation/publicPhoneMenu.ts` and its `.test.ts`.

**Produces:**
```ts
export interface MenuLink { name: string; href: string }
export function publicPhoneMenu(o: { signedIn: boolean; cartCount: number }): {
  primary: MenuLink[]; more: MenuLink[]; account: MenuLink[];
}
```
- `primary` is Home, Services, Membership, Self-service and Products, plus `{ name: "Cart (n)", href: "/products/cart" }` when `cartCount > 0`.
- `more` is About us, FAQ, Blog and Contact.
- `account` is Dashboard, Bookings, Billing and Profile and settings when signed in, otherwise `[]`.

- [ ] **Step 1: Failing tests.**
  - `"signed out: primary, more, no account"`
  - `"signed in: account group"`
  - `"cart row only with items, named with the count"`, for example `"Cart (2)"`
  - `"no Login anywhere"`
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement.** **Step 4: Run, expect PASS.** **Step 5: Commit** `feat(nav): phone menu link groups`

### Task 2: Shared `SheetLink`

**Files:** Create `components/user/SheetLink.tsx`, which takes `{ name, href, active, onNavigate }` as today. Modify `authNavbar.tsx` to import it.

- [ ] **Step 1: Move it.** **Step 2:** Run tsc and expect it clean. **Step 3: Commit** `refactor(nav): share the phone menu row`

### Task 3: The public sheet

**Files:** Modify `components/user/navbar.tsx`. Replace the old `Sheet` block and remove its now-unused state, imports and tooltip.

- [ ] **Step 1: Build it to the spec**, using Task 1's groups and Task 2's rows. "Book a detail" closes the sheet, then calls `openBookingModal()`.
- [ ] **Step 2: Checks.** Run `npx tsc --noEmit -p .` and `npx eslint components/user`, and the palette grep on `navbar.tsx`, which must now find no matches. `rg -n "Login|Book Online|Tap to Call" components/user/navbar.tsx` must find nothing.
- [ ] **Step 3: Probe.** `GET /` returns 200 and the bar renders. The sheet is client-only after mount, so it is checked on the preview.
- [ ] **Step 4: Commit** `feat(nav): public phone menu in the 24/7 Bay look`

### Task 4: DESIGN.md, checks, PR

- [ ] **Step 1:** In `DESIGN.md`, extend the Public navbar entry with the phone menu, and in Divergences keep only the footer as old style.
- [ ] **Step 2:** Run the full tests, tsc and eslint.
- [ ] **Step 3: Commit, review, then push and open the PR.** Preview checks:
  - phone, signed out and signed in;
  - tapping a row closes the sheet;
  - "Book a detail" opens the booking pop-up;
  - Sign out;
  - the call link.
