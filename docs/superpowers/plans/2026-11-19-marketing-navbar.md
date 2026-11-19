# Public Navbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public pages' top bar becomes the dashboard bar's navy sibling. It is aware of sign-in and leaves the phone menu as it is.

**Architecture:**
- A tested `isNavActive` function.
- A shared `AccountAvatar` component.
- `components/user/navbar.tsx` rewritten on the tokens, with Radix dropdowns for "More" and the account menu.

**Tech Stack:** Next.js 16, React 19, Tailwind tokens, shadcn DropdownMenu, `useAuth` / `useBooking` / `useProductCart`, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-marketing-navbar-design.md`

## Global Constraints

- No flame-filled control in the bar. Tokens only. 40px nav pills and 44px for other controls. 2px Flame focus outline.
- The phone sheet's content is unchanged in this plan; only the bar that opens it changes.
- The copy is exactly as in the spec: the link names, the "More" descriptions and the account menu items.
- CRLF. No Co-Authored-By trailer. Read-only GETs against `localhost:3000`.

## Review Focus

1. **Sign-in still loading.** Neither "Sign in" nor the avatar shows, so there's no flash. Checked in Task 3 step 2 against the code path.
2. **A More page** (`/faq`, `/blog/some-post`): "More" is marked current. Pinned in Task 1 (prefix match) and in Task 3's use of it.
3. **Home** (`/`): no link is marked current. Pinned in Task 1 (an exact match for `/`).
4. **An empty cart:** no basket shows. Checked in Task 3 step 3 (server HTML on a page without a cart).
5. **The signed-in avatar with no name:** the initial falls back to the email, then to "?", as `AuthNavbar` does today. This is kept by sharing the component.

---

### Task 1: `isNavActive`

**Files:** Create `lib/navigation/isNavActive.ts` and `lib/navigation/isNavActive.test.ts`.
**Produces:** `isNavActive(pathname: string, href: string): boolean`. It is exact for `"/"` and `"/dashboard"`, and otherwise matches `pathname === href || pathname.startsWith(href + "/")`.

- [ ] **Step 1: Failing tests.**
  - `"/" only matches itself"`
  - `"/services matches /services and /services/x, not /servicesx"`
  - `"/dashboard is exact"`
  - `"/blog matches a post"`
- [ ] **Step 2: Run, expect FAIL.** **Step 3: Implement**, and make `AuthNavbar`'s local `isActive` import it. **Step 4: Run, expect PASS.** **Step 5: Commit** `feat(nav): shared active-link rule`

### Task 2: Shared `AccountAvatar`

**Files:** Create `components/user/AccountAvatar.tsx`, moved from `authNavbar.tsx` (`AccountAvatar({ src, initial })`), and modify `authNavbar.tsx` to import it.

- [ ] **Step 1: Move it.** **Step 2:** Run `npx tsc --noEmit -p .` and expect no output. **Step 3: Commit** `refactor(nav): share the account avatar`

### Task 3: The public bar

**Files:** Modify `components/user/navbar.tsx` (keep the export name `UserNavbar`).

- [ ] **Step 1: Rebuild the desktop bar and menus to the spec.**
  - Keep today's phone `Sheet` and its contents. The menu button (44px, white/25 ring) opens it.
  - Use `useAuth()` for `user`, `userProfile`, `isLoading` and `signOut`, plus `useBooking().openBookingModal` and `useProductCart().count`.
  - Remove the transparent-on-scroll logic and the `isMounted` check from the bar itself. The sheet may keep its mounted check.
- [ ] **Step 2: Code-path check.**
  - The right side renders "Sign in" only when `!isLoading && !user`, and the avatar only when `user`.
  - Run `npx tsc --noEmit -p .` and `npx eslint components/user lib/navigation`, plus the palette grep on `navbar.tsx`. Expect clean output.
- [ ] **Step 3: Probe.** `GET /services` and `GET /` return 200.
  - The HTML has "THE LAUNCH PAD", "Membership", "More" and "Book".
  - It has no "Premium Car Care", "Book Online" or "Subscription" in the bar.
  - On `/services`, the Services link has `aria-current="page"`.
  - There is no basket on a fresh request.
- [ ] **Step 4: Commit** `feat(nav): public navbar in the 24/7 Bay look, aware of sign-in`

### Task 4: DESIGN.md, checks, PR

- [ ] **Step 1: Update `DESIGN.md`.** Under Navigation, add the "Public navbar" as AuthNavbar's sibling. In Divergences, the marketing navbar line now says only the phone menu sheet and the footer remain in the old style.
- [ ] **Step 2:** Run the full tests, tsc and eslint. Expect everything to pass with no new warnings.
- [ ] **Step 3: Commit, review, then push and open the PR.** Preview checks:
  - signed out and signed in on desktop;
  - the "More" menu;
  - the current-page highlight;
  - the basket after adding a product;
  - "Book" opens the booking pop-up;
  - below 1024px, the menu button still opens the phone menu.
