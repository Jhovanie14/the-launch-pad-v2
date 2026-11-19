# Public (marketing) navbar redesign (short design)

Date: 2026-11-19. Status: approved by the user (mockup shown and deleted after approval).

## Intent

The bar on every public page (`components/user/navbar.tsx`, used by `app/(user)/layout.tsx`) is the old style: 128px tall, white and transparent until scroll, full links only from 1280px, a blue-900 "Book Online", and "Login" even for signed-in customers. Make it the dashboard bar's (`AuthNavbar`) sibling in the 24/7 Bay look, aware of who is signed in.

## Scope / non-goals / anti-goals

- **In:** the desktop bar, the "More" menu and the account menu.
- **Out (next piece, the user's order):** the phone menu sheet. In this piece the menu button keeps opening today's sheet, unchanged.
- **Out:** the footer, page bodies, the booking pop-up (`BookingModal`), `AuthNavbar`.
- **Anti-goals:** a flame-filled control in the bar (the One Flame Rule gives the flame to page content); untrue copy; raw palette classes.

## Approaches

1. **Rebuild the public bar as AuthNavbar's sibling (picked):** same tokens, sizes, focus rules, and the same avatar component.
2. Restyle the old bar in place: keeps the 128px layout and the transparent-on-scroll logic. Rejected.

## Decisions

- **Bar.** Sticky Night bar, 64px, Bar shade, solid at all times. Logo (40px) plus "THE LAUNCH PAD" wordmark from 1280px, linking home.
- **Links** (from 1024px; below that only the logo and a 44px menu button):
  - Services (`/services`), Membership (`/pricing`, was "Subscription"), Self-service (`/self-service`), Products (`/products`).
  - "More" opens a white menu with one line each:
    - About us (`/about`): "Who we are and the wash on S Main St".
    - FAQ (`/faq`): "Answers about bays, booking and memberships".
    - Blog (`/blog`): "Car care tips and news from The Launch Pad".
    - Contact (`/contact`): "Call, email or send us a message".
  - Links are 40px, 0.875rem semibold pills: On Night Muted at rest, white/8 on hover. The current page gets `aria-current="page"` and a white/12 pill.
  - "More" is marked current on any of its four pages.
- **Right side:**
  - The basket only when the cart has items (count badge in Flame with On Flame text, link `/products/cart`).
  - A quiet outlined "Book" (white/25 ring, bold) that opens the booking pop-up, as today.
  - Then either "Sign in" (`/login`, quiet), or, when signed in, the avatar (36px, white/25 ring, Dusk fallback with the initial). The avatar opens an account menu: name and email, Dashboard (`/dashboard`), Bookings (`/dashboard/bookings`), Billing (`/dashboard/billing`), Profile and settings (`/dashboard/settings`), Sign out (`useAuth().signOut`).
  - While sign-in is loading, show neither (no flash of "Sign in").
- **Shared pieces.** The `AccountAvatar` moves out of `AuthNavbar` into `components/user/AccountAvatar.tsx` and both bars use it. Active-link matching is one tested function in `lib/` (exact match for `/`, prefix match otherwise).
- **Focus:** a 2px Flame outline on every control in the bar. The menus are Radix dropdowns (keyboard and Escape).

## Left to the builder

Icons; whether "More" uses the shadcn DropdownMenu or NavigationMenu (DropdownMenu preferred, matching AuthNavbar).
