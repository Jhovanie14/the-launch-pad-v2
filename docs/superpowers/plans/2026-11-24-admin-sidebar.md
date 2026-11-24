# Admin Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin sidebar so it has grouped, labelled links from one tested config, the 24/7 Bay look, a correct current page, and super-admin pages protected on the server.

**Architecture:**
- A typed config and filter in `lib/navigation/admin.ts` decides the groups and roles.
- A server helper plus four route layouts enforce super-admin access, and they are tested against the same config.
- The sidebar component renders the config on brand tokens.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4 tokens, lucide-react, Vitest (`lib/**/*.test.ts`, no DOM).

**Spec:** `docs/superpowers/specs/2026-11-24-admin-sidebar-design.md`

## Global Constraints

- Copy is exact, as in the spec's table: group labels "Today", "Customers", "What we sell", "Fleet", "Marketing"; item names as listed. Sentence case.
- Tokens only in `sidebar.tsx`: no `blue-*`, `gray-*`, `red-*`, `slate-*`, and no `text-[10px]`.
- Never a coloured side stripe.
- Current link: `bg-white/12`, `text-on-night`, semibold, `text-flame` icon, `aria-current="page"`.
- Focus: `FOCUS_ON_NIGHT` from `components/booking/ui/focus.ts`.
- 44px rows in the phone drawer, 40px from `lg`. 44px close button. 40px sign-out button.
- CRLF files. No Co-Authored-By trailer. Don't apply migrations (none needed).

## Review Focus

1. **A profile with `user_type` null or missing** is treated as a regular admin: no super-admin items, and the guard redirects. Pinned in Task 1 and Task 2.
2. **Sub-pages light up their parent:** `/admin/blog/new` and `/admin/blog/abc` → Blog; `/admin/dashboard` lights only Dashboard. Pinned in Task 1 via `activeHref`.
3. **A regular admin typing `/admin/promo`** (or services, addons, subscriptions) is redirected to `/admin/dashboard`. Pinned in Task 2's source test, which asserts the guarded set equals the config's super-admin set.
4. **Messages badge:** 0 shows nothing, 10 shows "9+". Pinned in Task 1 via `badgeLabel`.
5. **A new admin page added without a nav item** fails CI. Pinned in Task 1's coverage test.

---

### Task 1: Nav config and helpers

**Files:**
- Create: `lib/navigation/admin.ts`
- Create: `lib/navigation/admin.test.ts`

**Interfaces:**
- Produces:
```ts
import type { LucideIcon } from "lucide-react";
export type AdminBadge = "messages";
export interface AdminNavItem { name: string; href: string; icon: LucideIcon; requires?: "super_admin"; badge?: AdminBadge }
export interface AdminNavSection { label: string | null; items: AdminNavItem[] } // null = no heading
export const ADMIN_NAV: AdminNavSection[];          // top (Dashboard), Today, Customers, What we sell, Fleet, Marketing
export const ADMIN_NAV_FOOTER: AdminNavItem;        // Settings
export function isSuperAdmin(userType: string | null | undefined): boolean; // === "super_admin"
export function adminNav(userType: string | null | undefined, sections?: AdminNavSection[]): AdminNavSection[]; // drops gated items and empty sections
export function activeHref(pathname: string): string | null; // the one item href (incl. footer) that isNavActive matches, longest wins
export function isSuperAdminRoute(pathname: string): boolean;
export function badgeLabel(count: number): string | null; // 0 → null, 1-9 → "n", >9 → "9+"
```
- Icons, from the spec: LayoutDashboard, CalendarDays, Package, MessageCircle, QrCode, Users, CreditCard, Car, CirclePlus, ShoppingBasket, TicketPercent, Building2, FileText, Megaphone, Mail, Notebook, Settings.

- [ ] **Step 1: Write the failing tests** in `admin.test.ts`:
  - `"groups and items are the approved copy"`: map `ADMIN_NAV` to `[label, items.map(name)]` and expect exactly:
    - `[null, ["Dashboard"]]`
    - `["Today", ["Bookings","Store orders","Messages","Pay & tip QR codes"]]`
    - `["Customers", ["Customers & staff","Memberships"]]`
    - `["What we sell", ["Services","Add-ons","Products","Promo codes"]]`
    - `["Fleet", ["Fleet inquiries","Fleet contracts & invoices"]]`
    - `["Marketing", ["Campaigns","Direct email","Blog"]]`

    And `ADMIN_NAV_FOOTER.name === "Settings"`.
  - `"hrefs match the spec"`: an expected list of the 17 hrefs, in order, including the footer.
  - `"every icon is distinct"`: a `Set` of all 17 icons has size 17.
  - `"super admin sees everything"`: `adminNav("super_admin")` deep-equals `ADMIN_NAV`.
  - `"regular, null and unknown user types lose the super-admin items"`: for each of `"admin"`, `null`, `undefined` and `"customer"`, the flattened names exclude "Memberships", "Services", "Add-ons" and "Promo codes", and keep "Products" and "Customers & staff".
  - `"empty sections are dropped"`: `adminNav("admin", [{ label: "X", items: [{ ...anyItem, requires: "super_admin" }] }])` → `[]`.
  - `"sub-pages light their parent"`:
    - `activeHref("/admin/blog/new")` → `"/admin/blog"`
    - `activeHref("/admin/blog/abc/edit")` → `"/admin/blog"`
    - `activeHref("/admin/dashboard")` → `"/admin/dashboard"`
    - `activeHref("/admin/settings")` → `"/admin/settings"`
    - `activeHref("/admin")` → `null`
  - `"super-admin routes"`:
    - `isSuperAdminRoute("/admin/promo")` and `("/admin/services/x")` → true
    - `("/admin/products")` → false
  - `"badge label"`: `badgeLabel(0)` → null, `(3)` → `"3"`, `(10)` → `"9+"`.
  - `"every admin page is in the nav"`: glob `app/admin/**/page.tsx` with `fs.readdirSync` recursively. Turn each into a route by stripping `app` and `/page.tsx`, so `[id]` stays as a literal segment. Except `/admin`, each must have a non-null `activeHref`.
- [ ] **Step 2: Run** `npx vitest run lib/navigation/admin.test.ts`. Expected: FAIL, the module can't be resolved.
- [ ] **Step 3: Implement** `lib/navigation/admin.ts`. `activeHref` uses `isNavActive` from `./isNavActive` over every item plus the footer, and picks the longest matching href.
- [ ] **Step 4: Run** the same command. Expected: PASS, 10 tests.
- [ ] **Step 5: Commit:** `git add lib/navigation/admin.ts lib/navigation/admin.test.ts && git commit -m "feat(admin): grouped nav config"`

### Task 2: Super-admin pages guarded on the server

**Files:**
- Create: `lib/auth/superAdminPage.ts`
- Create: `app/admin/services/layout.tsx`, `app/admin/addons/layout.tsx`, `app/admin/promo/layout.tsx`, `app/admin/subscriptions/layout.tsx`
- Create: `lib/auth/superAdminPageSource.test.ts`

**Interfaces:**
- Consumes: `ADMIN_NAV` and `isSuperAdmin` from Task 1.
- Produces: `export async function requireSuperAdminPage(): Promise<void>`. It calls `getUserProfile()` from `@/auth/actions`; when `!isSuperAdmin(profile?.user_type)`, it calls `redirect("/admin/dashboard")` from `next/navigation`. Each layout is `export default async function X({ children }) { await requireSuperAdminPage(); return children; }`.

- [ ] **Step 1: Write the failing source test** `"guarded folders are exactly the super-admin nav items"`:
  - Collect the `href`s of items with `requires === "super_admin"` → `["/admin/subscriptions","/admin/services","/admin/addons","/admin/promo"]` (as a set).
  - For each, `app${href}/layout.tsx` exists and its text contains `requireSuperAdminPage()`.
  - Conversely, every `app/admin/*/layout.tsx` whose text contains `requireSuperAdminPage` maps to one of those hrefs.
  - Also: `lib/auth/superAdminPage.ts` contains `redirect("/admin/dashboard")` and `isSuperAdmin(`.
- [ ] **Step 2: Run** `npx vitest run lib/auth/superAdminPageSource.test.ts`. Expected: FAIL, the layouts are missing.
- [ ] **Step 3: Implement** the helper and the four layouts.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then run `npx tsc --noEmit -p .` and expect no output.
- [ ] **Step 5: Commit:** `git add lib/auth/superAdminPage.ts lib/auth/superAdminPageSource.test.ts app/admin/*/layout.tsx && git commit -m "fix(admin): super-admin pages block regular admins on the server"`

### Task 3: The sidebar

**Files:**
- Modify: `components/admin/sidebar.tsx` (rewrite the render; keep the contacts realtime count and the drawer props).
- Modify: `types/index.ts` (add `user_type?: string | null` to `AuthUser`).
- Create: `lib/navigation/adminSidebarSource.test.ts`

**Interfaces:**
- Consumes: `adminNav`, `ADMIN_NAV_FOOTER`, `activeHref`, `badgeLabel` and `isSuperAdmin` from Task 1. `FOCUS_ON_NIGHT` from focus.ts.
- Unchanged props: `{ user?: AuthUser; open: boolean; onClose: () => void }`. `admin-shell.tsx` is untouched.

- [ ] **Step 1: Write the failing source tests**, reading `components/admin/sidebar.tsx` as text:
  - `"renders the shared config"`: contains `adminNav(` and `activeHref(` and `badgeLabel(`; contains no `const navigation = [`.
  - `"marks the current page"`: contains `aria-current`.
  - `"groups are labelled"`: contains `role="group"` and `aria-labelledby`, and `aria-label="Admin"` on the nav.
  - `"tokens only"`: no match for `/(blue|gray|red|slate)-\d/` and no `text-[10px]`.
  - `"no fake sign-out wait and no browser role fetch"`: no `setTimeout`, no `.select("user_type")`.
  - `"sign-out is a labelled button"`: contains `type="button"` and the text `Sign out`.
- [ ] **Step 2: Run** `npx vitest run lib/navigation/adminSidebarSource.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** to the spec's "Look" section:
  - `user?.user_type` feeds `adminNav`;
  - the role line reads "Super admin" or "Admin";
  - the badge pill uses `bg-flame text-on-flame` and has an sr-only " unread";
  - each link calls `onClose` on click;
  - `LoadingDots` still shows while signing out.
- [ ] **Step 4: Run** the same command and expect PASS. Then run `npx vitest run`, `npx tsc --noEmit -p .` and `npx eslint components/admin lib/navigation lib/auth app/admin`. Expected: everything green, and no new eslint errors.
- [ ] **Step 5: Commit:** `git add components/admin/sidebar.tsx types/index.ts lib/navigation/adminSidebarSource.test.ts && git commit -m "feat(admin): grouped sidebar on the 24/7 Bay look"`

### Task 4: DESIGN.md

**Files:** Modify `DESIGN.md`.
- Add an "Admin sidebar" entry describing the groups, tokens, current pill, flame badge and role filtering.
- Update the admin divergence line (around line 529): the sidebar is on the tokens, and the admin pages are not yet.

- [ ] **Step 1: Edit.** **Step 2: Run** `npx vitest run` and expect green. **Step 3: Commit:** `docs(design): admin sidebar`
