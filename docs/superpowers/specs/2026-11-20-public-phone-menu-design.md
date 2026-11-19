# Public phone menu (short design)

Date: 2026-11-20. Status: approved by the user.

## Intent

Below 1024px the public bar's menu button still opens the old white sheet (blue buttons, "Login" even when signed in, gray hover classes). Make it the dashboard phone menu's sibling in the 24/7 Bay look, aware of sign-in.

## Approaches

1. **Mirror AuthNavbar's phone sheet (picked):** same Night sheet, row style and focus rules; share its row component.
2. Restyle the old sheet in place: keeps the accordion "About" and tooltip call link. Rejected.

## Decisions

- **Sheet:** from the right, Night, 85vw, max 24rem. Close button in On Night, safe-area inset at the bottom.
- **Header:** signed in shows `AccountAvatar` plus name and email. Signed out shows the logo and "The Launch Pad". Either way the header is the sheet's title.
- **One flame "Book a detail"** (CalendarPlus icon), which closes the sheet and opens the booking pop-up.
- **Rows** (48px, white/12 pill when current, from `isNavActive`):
  - Home `/`, Services `/services`, Membership `/pricing`, Self-service `/self-service`, Products `/products`;
  - "Cart (n)" `/products/cart` only when the cart has items;
  - a "More" group: About us `/about`, FAQ `/faq`, Blog `/blog`, Contact `/contact`;
  - signed in only, an "Account" group: Dashboard, Bookings, Billing, Profile and settings.
  - Group headings are 0.75rem semibold in On Night Subtle.
- **Footer:**
  - signed in: "Sign out", using the same loader rule as the bar;
  - signed out: "Sign in" `/login`;
  - always: a "Call (832) 219-8320" row (`tel:+18322198320`, Phone icon).
- **Shared code:** the menu's link groups come from one tested function in `lib/navigation/`. The row component moves out of `AuthNavbar` into a shared file.
- **Removed:** the old sheet, its accordion state, the tooltip, the blue buttons and "Login" for signed-in customers.
