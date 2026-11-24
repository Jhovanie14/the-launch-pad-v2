# Admin sidebar (short design)

Date: 2026-11-24. Status: the user approved the mockup ("looks good").

## Intent

The admin sidebar (`components/admin/sidebar.tsx`) is 17 links in one flat, hard-coded list. The owner wants:
- every link under a group label;
- a structure that is easy to extend and consistent.

The critique of 2026-11-24 scored the sidebar 16/36 and found these problems:
- Mixed casing ("fleet inquiry").
- Both fleet links share one icon, and Add-ons uses the delivery truck.
- An exact-match active state, so blog sub-pages highlight nothing, and there is no `aria-current`.
- Role gating keyed on display names.
- A 128px header with an unbranded tagline.
- An icon-only sign-out with a fake 2s wait.
- The super-admin pages are only hidden from the nav. A regular admin who types the URL can still open them.

## Goals, non-goals, anti-goals

**Goals:**
- Grouped links, from one typed, tested config.
- The 24/7 Bay look for the sidebar.
- The correct current page on sub-pages.
- Super-admin pages protected on the server.

**Non-goals:**
- Restyling the admin pages beside the sidebar. That happens in the store and products projects.
- New work counts for orders and bookings. They come with the store project, once the order data supports them.

**Anti-goals:**
- A link that silently goes missing when a new admin page is added.
- A regular admin who can open a super-admin page.

## Approaches

1. **Typed config in `lib/navigation/admin.ts`, rendered by the existing sidebar (picked).** This mirrors `publicPhoneMenu`. It is testable without a DOM and keeps the drawer architecture in `admin-shell.tsx`.
2. Adopt shadcn's `Sidebar` component (SidebarGroup / SidebarGroupLabel). Rejected:
   - it isn't installed;
   - it brings its own provider, cookie state and collapse behaviour;
   - it would still need the same config.
3. Keep the list in the component and add headings inline. Rejected: the list stays untested, and roles stay keyed by name.

## Decisions

**Config.** `lib/navigation/admin.ts` exports:
- `ADMIN_NAV: AdminNavSection[]`;
- `adminNav(userType)`, which filters by role and drops empty groups;
- `isSuperAdminRoute(pathname)`.

Each item has `{ name, href, icon, requires?: "super_admin", badge?: "messages" }`. Icons are lucide components.

**Order and labels.** Exact copy:

| Group | Items |
|---|---|
| (top, no label) | Dashboard `/admin/dashboard` (LayoutDashboard) |
| **Today** | Bookings `/admin/booking` (CalendarDays) · Store orders `/admin/orders` (Package) · Messages `/admin/contact` (MessageCircle, badge "messages") · Pay & tip QR codes `/admin/qr` (QrCode) |
| **Customers** | Customers & staff `/admin/users` (Users) · Memberships `/admin/subscriptions` (CreditCard, super admin) |
| **What we sell** | Services `/admin/services` (Car, super admin) · Add-ons `/admin/addons` (CirclePlus, super admin) · Products `/admin/products` (ShoppingBasket) · Promo codes `/admin/promo` (TicketPercent, super admin) |
| **Fleet** | Fleet inquiries `/admin/fleet-inquiry` (Building2) · Fleet contracts & invoices `/admin/fleet-payment-management` (FileText) |
| **Marketing** | Campaigns `/admin/campaigns` (Megaphone) · Direct email `/admin/broadcast` (Mail) · Blog `/admin/blog` (Notebook) |
| (pinned bottom, no label) | Settings `/admin/settings` (Settings) |

**Roles.**
- `user_type === "super_admin"` sees everything.
- Any other admin doesn't see the four super-admin items, and a group left with no items disappears.
- The sidebar reads `user_type` from the profile the layout already loads. It no longer fetches it in the browser after rendering.

**Server guard.**
- `app/admin/{services,addons,promo,subscriptions}/layout.tsx` each call one shared helper.
- The helper redirects a non-super-admin to `/admin/dashboard`.
- A source test checks that the set of guarded folders equals the config's `requires: "super_admin"` hrefs, so the guard and the nav can't drift apart.

**Current page.**
- Uses `isNavActive(pathname, href)` from `lib/navigation/isNavActive.ts`, so `/admin/blog/new` lights up Blog.
- The current link gets `aria-current="page"`.

**Coverage test.**
- Every `app/admin/**/page.tsx` must map to a config item by `isNavActive`.
- The only exception is `/admin`, the admin login redirect.

**Look** (the 24/7 Bay tokens, matching the customer navbar):
- **Sidebar:** `bg-night`, 256px (`w-64`), with a hairline `white/10` right edge. The top and bottom dividers are `white/10` as well.
- **Header:** 64px. The logo is 32px. Beside it, "The Launch Pad" in 900 weight `text-on-night`, with "Admin" under it in 0.75rem `text-on-night-subtle`. The close button is 44px, phone drawer only.
- **Group labels:** an `h2` per group, 0.75rem semibold `text-on-night-subtle`, sentence case, no letter-spacing. Each group is a `<div role="group" aria-labelledby>`. The whole sidebar is `<nav aria-label="Admin">`.
- **Links:**
  - `rounded-lg`, 0.875rem medium. 40px tall from `lg`, 44px in the phone drawer.
  - At rest: `text-on-night-muted`. On hover: `bg-white/8` with `text-on-night`.
  - Current: `bg-white/12`, `text-on-night`, semibold, with a `text-flame` icon.
  - Icons are 18px.
  - Focus: `FOCUS_ON_NIGHT`.
  - No coloured side stripe (DESIGN.md).
- **Messages badge:** the existing realtime count of contacts with status "new", shown as a pill at the right of the row with "9+" over nine.
  - **My call:** the badge uses `bg-flame text-on-flame`, 0.75rem bold, rather than the mockup's red, because white on Brand Red fails contrast at 12px.
  - It has an sr-only "unread" label.
- **Footer:**
  - A 36px avatar, with a `bg-dusk` and `text-flame` fallback.
  - The name, truncated, and the role: "Super admin" or "Admin".
  - A `type="button"` "Sign out" button with a LogOut icon: 40px, `ring-1 ring-white/25`, `hover:bg-white/10`.
  - The fake 2s delay is removed. The existing `LoadingDots` overlay still shows while signing out.
- **Phone drawer:** the behaviour stays the same (overlay, slide, `lg` breakpoint), with a `bg-black/50` overlay.

**Out of scope, unchanged:** `admin-shell.tsx`'s small-screen header, and every admin page body.

## Left to the builder

- Exact class strings, within the decisions above.
- Where the guard helper lives: `lib/auth/` or `auth/`. It is server-only and must reuse `getUserProfile`.
