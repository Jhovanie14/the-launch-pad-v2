---
name: The Launch Pad
description: Car wash, self-service bays and express detailing at 10410 S Main St, Houston; one roof, one flow.
colors:
  flame: "oklch(0.86 0.165 88)"
  flame-bright: "oklch(0.91 0.14 94)"
  on-flame: "oklch(0.2 0.07 262)"
  brand-blue: "oklch(0.5 0.15 258)"
  brand-red: "oklch(0.64 0.21 25)"
  svc-self: "oklch(0.8 0.11 232)"
  svc-self-mark: "oklch(0.58 0.14 240)"
  svc-detail-mark: "oklch(0.6 0.15 58)"
  svc-member: "oklch(0.74 0.16 22)"
  night: "oklch(0.2 0.07 262)"
  dusk: "oklch(0.265 0.085 261)"
  night-raised: "oklch(0.33 0.1 260)"
  on-night-muted: "oklch(0.85 0.035 255)"
  on-night-subtle: "oklch(0.73 0.045 255)"
  ink: "oklch(0.2 0.07 262)"
  ink-muted: "oklch(0.46 0.04 258)"
  ink-subtle: "oklch(0.55 0.04 258)"
  line: "oklch(0.91 0.016 255)"
  line-soft: "oklch(0.955 0.01 255)"
  canvas: "oklch(0.975 0.006 250)"
  paper: "oklch(1 0 0)"
  legacy-navy: "oklch(37.9% 0.146 265.522)"
  legacy-amber: "oklch(82.8% 0.189 84.429)"
  storefront-gold: "oklch(0.8 0.132 86)"
typography:
  display-hero:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  bay-display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 900
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  label-action:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  nav-link:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.429
  dock-label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.333
  plate:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.429
    letterSpacing: "0.12em"
  plate-xl:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  plate: "5px"
  chip: "8px"
  control: "10px"
  tile: "14px"
  surface: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "28px"
  side-column: "320px"
components:
  button-primary:
    backgroundColor: "{colors.flame}"
    textColor: "{colors.on-flame}"
    typography: "{typography.label-action}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.flame-bright}"
    textColor: "{colors.on-flame}"
  button-quiet-dark:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-quiet-dark-hover:
    backgroundColor: "rgb(255 255 255 / 0.1)"
  button-solid-light:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-solid-light-hover:
    backgroundColor: "{colors.night-raised}"
  button-ghost-light:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ghost-light-hover:
    backgroundColor: "{colors.line-soft}"
  row-action:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
  row-action-hover:
    backgroundColor: "{colors.canvas}"
  nav-bar:
    backgroundColor: "{colors.night}"
    textColor: "{colors.on-night-muted}"
    height: "64px"
  nav-link-active:
    backgroundColor: "rgb(255 255 255 / 0.12)"
    textColor: "{colors.paper}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "40px"
  nav-book:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  surface-pass:
    backgroundColor: "{colors.night}"
    textColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "20px"
  surface-now:
    backgroundColor: "{colors.dusk}"
    textColor: "{colors.paper}"
    rounded: "{rounded.surface}"
    padding: "20px"
  surface-light:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "20px"
  license-plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.plate}"
    rounded: "{rounded.plate}"
    padding: "2px 8px"
  license-plate-xl:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.plate-xl}"
    rounded: "{rounded.plate}"
    padding: "8px 16px"
  dock-item:
    backgroundColor: "transparent"
    textColor: "{colors.paper}"
    typography: "{typography.dock-label}"
    rounded: "{rounded.tile}"
    height: "56px"
  dock-item-primary:
    backgroundColor: "{colors.flame}"
    textColor: "{colors.on-flame}"
    typography: "{typography.dock-label}"
    rounded: "{rounded.tile}"
    height: "56px"
---

# Design System: The Launch Pad

## Overview

**Creative North Star: "The 24/7 Bay"**

The customer world looks like the site after dark, in the logo's own colours: deep navy surfaces, white type, and one flame-yellow light that marks where to go next. It was built for a person standing at 10410 S Main St with a phone in one hand (see PRODUCT.md for who uses the product and why). The navbar, the membership pass, the next appointment and the thumb dock are the bay at night. History, site facts and requests sit on plain white cards next to the navy blocks. That is the whole tonal story: dark for what matters now and who you are, white for everything you might read later.

Every colour comes from the logo: the royal-blue outline, the red lettering, the yellow-orange rocket flame, and white. Navy (a deep cut of the logo blue) is the night, not black or slate. The flame is the one action. Each service wears one logo colour, so "three services, one location" reads in the palette itself: sky for self-service, flame for express detailing, red for membership. Display type is Geist at its heaviest weight (900) with tight tracking. Monospace appears only on license plates, drawn as real white plates so an attendant can match them by eye. The home's opening comment (`app/(dashboard)/dashboard/page.tsx`) is the direction contract: the home is "the customer's pass and their next move", never a stat board.

The colours are **design tokens**. `app/globals.css` ("Launch Pad brand tokens") defines `--lp-*` primitives measured from the logo, then exposes semantic Tailwind utilities through `@theme inline` (`bg-night`, `text-on-night-muted`, `bg-flame`, `text-svc-member` …). Components use those names, never raw palette classes such as slate-950 or blue-900; change a colour there and the whole customer area follows. The `.lp-theme` class on the dashboard shell (`app/(dashboard)/layout.tsx`) remaps shadcn's `--primary`, `--ring`, `--border` and neutrals to navy, brand blue and the cool neutrals, so shadcn controls inside the customer area follow too. The marketing site and admin have not moved to the tokens yet (see Divergences).

**Key Characteristics:**
- Navy night and dusk surfaces for identity and time-sensitive content. White cards with a hairline ring for history, site info and requests.
- One flame-filled action per viewport. Every other control is quiet.
- Service colours from the logo (sky / flame / red) used as text tints and icons, never as fills.
- Geist Sans at 900 weight with tight tracking for dates, plan names and greetings.
- Geist Mono only on license plates, which are drawn as physical white plates.
- 44px minimum touch targets, 56px dock targets, visible focus outlines tuned to the surface.
- Reduced motion respected globally (`MotionConfig reducedMotion="user"`) and per element (`motion-reduce:`).

## Colors

Logo navy and white, one flame-yellow signal, and one logo colour per service; neutrals are cool and tinted toward the logo blue.

### Primary
- **Flame** (`flame`): the logo's rocket flame and the one filled call to action on screen. Examples are "Show at the bay" on the member pass, "Book a detail" for non-members, the flame dock item and the phone menu's "Book a detail". Also the primary-vehicle star, the "cancelling" status line, the focus outline on navy, and the express-detailing service tint (`svc-detail`).
- **Flame Bright** (`flame-bright`): hover state of Flame and the focus outline around flame-filled buttons.
- **On Flame** (`on-flame`): text and icons on Flame. It is the logo navy, not a brown or amber-950.

### Secondary
- **Brand Blue** (`brand-blue`, also `focus`): the logo outline blue. It is the focus outline on white surfaces, shadcn's `--ring` inside `.lp-theme`, and the icon colour for site links ("Get directions", "Shop car care").
- **Self-service Sky** (`svc-self`): text tint for self-service on navy ("Self-service plan", "Self-service bay" check-in line, the welcome row).
- **Self-service Sky Mark** (`svc-self-mark`): a deeper sky that holds 3:1 on white as well as navy. Used for the Droplets icon in the visits list and the site card.

### Tertiary
- **Membership Red Soft** (`svc-member`): text tint for membership on navy ("Express membership", "Unlimited membership"). Membership is the logo red, not violet.
- **Brand Red** (`brand-red`, also `svc-member-mark`): the logo lettering red, defined for membership icons on white. Not yet used in a component.
- **Detailing Mark** (`svc-detail-mark`): a deep flame-orange that holds 3:1 on white, for the Sparkles icon in the visits list and site card. On navy, express detailing uses Flame as its text tint.

### Neutral
- **Night** (`night`, logo navy 950): the navbar, member pass, welcome card, inline error card, full-screen bay pass, phone menu sheet, phone dock (at 95%). Also `ink`, the text colour on white, and shadcn `--primary` in `.lp-theme`.
- **Dusk** (`dusk`, navy 900): the Now card, one step lighter than Night so it reads as a separate block under the pass. At 90% it is the dark skeleton colour; it is also the avatar fallback fill.
- **Night Raised** (`night-raised`, navy 800): hover of the solid navy button on white.
- **On Night Muted** (`on-night-muted`): secondary text on navy (Now card detail lines, inactive nav links, the Manage link, status lines).
- **On Night Subtle** (`on-night-subtle`): tertiary text on navy (plan description, " · " separators, arrows, sheet email and section label).
- **Ink Muted** (`ink-muted`): secondary text on white (visit detail lines, empty states, opt-in body, site-card labels, "No thanks").
- **Ink Subtle** (`ink-subtle`): visit dates and the product-order bag icon.
- **Line** (`line`): the 1px ring around white surfaces, row actions and visit icons; plate border; light skeletons; shadcn `--border` / `--input`.
- **Line Soft** (`line-soft`): dividers between visit rows and the hover fill of ghost buttons and site links.
- **Canvas** (`canvas`): the page behind the whole dashboard and the fill of visit-icon circles. Navy blocks and white cards both sit on it.
- **Paper** (`paper`): white surfaces, plate ground and text on navy (`on-night`).
- **White hairlines**: borders on navy are white at low alpha: 10% rings and dividers, 12% active nav pill, 20% quiet-button outlines, 25% the navbar Book outline and avatar ring, 30% the bay "Done". These are alpha values, not tokens.

### Legacy and scoped colors (not part of this world)
- **Legacy Navy** (blue-900): the older accent, still on the marketing site below the hero, the marketing navbar, the inner customer pages (bookings, billing, orders, pricing, settings, self-service log) and the admin console.
- **Legacy Amber** (amber-400, with slate-950/900 and violet): the marketing hero still draws the old slate-and-amber world with raw palette classes.
- **Storefront Gold** (`--gold`): applied only inside `.storefront` on `/products`, where it becomes `--primary`. Outside `.lp-theme` and `.storefront`, shadcn `--primary` is still neutral near-black.

### Named Rules
**The One Flame Rule.** Exactly one flame-filled control per viewport. When a member pass is on screen, it owns the flame ("Show at the bay"): the Now card's actions turn quiet (`hasPass`) and the phone dock gives its flame slot to "Show at bay". Without a pass, the Now card's lead action and the dock's "Book" take the flame. The navbar's "Book" is always quiet.

**The Hue Is a Legend Rule.** Sky, flame and red tell you which service you are looking at. They appear as text tints on navy and as icons (the `-mark` shades on white) and never as surface fills. Colour is never the only cue: each service also has its icon (Droplets, Sparkles) or its name.

**The Tokens Not Palette Rule.** Customer-world code uses the semantic utilities from `app/globals.css`. A raw `slate-*`, `amber-*`, `violet-*` or `blue-900` class in the customer area is a bug.

## Typography

**Display Font:** Geist Sans (loaded with `next/font` as `--font-geist-sans`, mapped to `--font-sans`)
**Body Font:** Geist Sans
**Label/Mono Font:** Geist Mono (`--font-geist-mono`), on license plates only

**Character:** One family carries everything. Hierarchy comes from weight jumps, with Black (900) for display against Regular and Semibold for reading. Tight negative tracking makes dates and plan names feel stamped, not typeset. Mono shows up only where the real-world object is a stamped plate.

### Hierarchy
- **Display Hero** (900, 3rem rising to 3.75 / 4.5 / 6rem at sm / md / lg, line-height 0.95, tracking -0.035em, balanced): the marketing hero headline only.
- **Bay Display** (900, 2.25rem, 3.75rem from 640px, line-height 1): the holder's name on the full-screen bay pass, read at arm's length.
- **Display** (900, 1.875rem, 2.25rem from 640px, tracking -0.025em, balanced): plan names on the member pass, the Now card's appointment date and time, "You're checked in since…", the welcome heading. Appointment parts are wrapped `whitespace-nowrap` so a time never breaks across lines.
- **Headline** (900, 1.5rem, 1.875rem from 640px): the page greeting "Hi, {first name}" and the idle Now card prompt.
- **Title** (900, 1.25rem): headings of white sections ("Your visits"). The site card's address heading is 900 at 1rem. Bold (700) at 1rem for small white-card headings such as the opt-in question and welcome service names.
- **Body** (400, 1rem, line-height 1.5): detail lines under display headings. Descriptions use 0.875rem with relaxed leading (1.625), capped at `max-w-prose` (65ch).
- **Label** (600 for quiet controls and status lines, 700 for flame-filled controls and the navbar Book, 1rem; 0.875rem for row actions, nav links and site links): button and link text, sentence case.
- **Dock Label** (600, 0.75rem): the icon-over-label phone dock items.
- **Plate** (Geist Mono 600, uppercase, 0.875rem, tracking 0.12em; XL: 1.875rem, 2.25rem from 640px, tracking 0.14em): license plates only.
- Visit dates use **tabular numerals** (semibold, 0.875rem, Ink Subtle) in a fixed 56px column.

### Named Rules
**The Black Weight Rule.** Display moments in this world (dates, plan names, the greeting, section titles) are Geist at 900 with tight tracking. They are never bold-700 headings in a second family.

**The Mono Is a Plate Rule.** Geist Mono is for license plates, not for prices, IDs or "technical" flavor.

## Layout

**Dashboard shell.** `app/(dashboard)/layout.tsx` wraps everything in `.lp-theme` on Canvas, with the sticky 64px navbar on top and a `<main id="main">` capped at 80rem (`max-w-7xl`) with 16 / 24 / 32px gutters and 32px vertical padding.

**Dashboard home.** Below 1024px it is one column with 24px between blocks: greeting, pass(es), Now card, visits, site card, then the opt-in row last. From 1024px it becomes a two-column grid, a flexible main column (`minmax(0,1fr)`) plus a fixed 320px (20rem) side column with a 24px gap, aligned to the top. The side column is sticky at 96px and holds only the site card; there is no desktop action rail, because "Book" lives in the navbar. The opt-in row stays last at every size, and on desktop it is limited to the main column's width (`calc(100% - 21.5rem)`).

**Phone dock.** Below 1024px a fixed bottom dock carries Book / Show at bay or Bookings / Shop. It is centered with a 28rem maximum width, uses 8px gaps between three equal items, has 12px side padding, and keeps the safe-area inset at the bottom (`max(0.5rem, env(safe-area-inset-bottom))`). The page adds 112px of bottom padding so content is not hidden behind it.

**Surface padding.** Navy and white surfaces use 20px padding, 28px from 640px. The site card uses 20px.

**Marketing hero.** Full-bleed at `min-h-svh` with a photograph (`/self-service.png`) under a dark scrim gradient (70% → 65% → 90%). Content is capped at 80rem with 20px / 32px gutters and 96px / 128px top padding. The service picker becomes three columns from 768px with 16px gaps.

**Breakpoints in use:** 640px (type steps, padding), 768px (navbar links, avatar menu and hero grid), 1024px (side column versus dock), 1280px (navbar wordmark, marketing navbar collapse).

## Elevation & Depth

The world is mostly flat. Depth comes from tone: Canvas → white card with a 1px Line ring, or Canvas → Night/Dusk block with a 1px white/10 ring. Dusk sitting under Night separates the Now card from the pass without a shadow. Only three shadows exist in the customer world, and each has a reason.

### Shadow Vocabulary
- **Pass lift** (`box-shadow: 0 18px 40px -24px rgb(8 20 52 / 0.9)`): under the member pass only. A long, soft, navy-tinted downward shadow that makes the pass read as a card you hold.
- **Plate edge** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.25)`): a 1px bottom lip under license plates, like a stamped metal edge.
- **Bar shade** (`box-shadow: 0 8px 24px -16px oklch(0.2 0.07 262 / 0.8)`): a faint navy fall-off under the sticky navbar, so content scrolling under it stays separate.

The phone dock is the one translucent surface: Night at 95% with `backdrop-blur`, so content scrolling behind it is still faintly visible.

### Named Rules
**The Tone-Not-Shadow Rule.** Separate blocks by surface tone (Canvas / white / Dusk / Night) and hairline rings. Add a shadow only when the object is physical (the pass, a plate) or sits over scrolling content (the bar).

## Shapes

Corners are generous and consistent, with radius by role. Surfaces use 16px (`rounded-2xl`). Dock items and welcome service rows use 14px (`rounded-xl`, which the project's `--radius` makes `0.625rem + 4px`). Buttons, nav links and site links use 10px (`rounded-lg`, which equals `--radius`). The pass's "Manage" link uses 8px. Plates use a deliberate 5px so they look like plates, not pills. Visit icons sit in 32px circles; the avatar is a 36px circle. The full-screen bay pass has no rounding and fills the viewport (`h-dvh`, `rounded-none`). Welcome-row thumbnails are photographs cropped to 96×72 with 10px corners.

Borders are 1px hairlines everywhere: rings around surfaces and visit icons, dividers between vehicle rows (white/10) and visit rows (Line Soft), and outlines on quiet buttons. Nothing uses a thick coloured side stripe.

## Components

### Buttons
Big targets, few of them, and only one of them loud.
- **Shape:** gently rounded (10px), at least 44px tall, icon + label with 8px gap, sentence case.
- **Primary (flame):** Flame fill, On Flame (navy) text, bold label, 20px horizontal padding. Full width on phones under the pass, auto width from 640px.
- **Hover / Focus:** hover changes to Flame Bright with a colour transition (150ms). Focus is a 2px Flame Bright outline offset by 2px.
- **Quiet on dark:** transparent, white semibold text, 1px white/20 outline. Hover adds a white/10 fill. Focus is a 2px Flame outline.
- **Solid on light:** Night fill, white text, Night Raised on hover. 60% opacity when disabled. Focus is a 2px Brand Blue outline offset 2px. Used for "Yes, email me".
- **Ghost on light:** Ink Muted text, Line Soft hover fill. Used for "No thanks".
- **Row action (on light):** 44px tall, 12px padding, 0.875rem semibold Ink text, 1px Line ring, Canvas hover. Used for "Book again" and "How was it?".
- **Bay "Done":** 48px tall, 24px padding, white/30 outline, on the full-screen pass.

### Cards / Containers
- **Corner Style:** 16px on every surface.
- **Background:** Night for the member pass, welcome card and error card. Dusk for the Now card. Paper for visits, site card and opt-in.
- **Shadow Strategy:** none, except Pass lift on the member pass (see Elevation & Depth).
- **Border:** a 1px ring, white/10 on navy and Line on white.
- **Internal Padding:** 20px, 28px from 640px (opt-in 24px).
- **Loading:** placeholders take the shape and tone of what they replace (Dusk at 90% for navy blocks, Line for light ones) and pulse only when motion is allowed.
- **Error:** an inline Night card with `role="alert"` that names what failed ("Couldn't load your membership.") and offers a quiet "Try again". It never falls back to a misleading empty state.

### Navigation
- **Customer navbar (`AuthNavbar`):** fully in this world. A sticky 64px Night bar with Bar shade. The logo (`/thelaunchpad.png`, 40px) plus a 900-weight "THE LAUNCH PAD" wordmark from 1280px. From 768px, five links (Home, Bookings, Self-service, Orders, Membership) as 40px, 0.875rem semibold pills: On Night Muted at rest, white/8 on hover, and the current page marked with `aria-current="page"` and a white/12 pill in white. On the right, a quiet outlined "Book" (white/25 border, bold, white/10 hover), hidden on phones on `/dashboard` because the dock carries it, then an avatar button (36px, white/25 ring, Dusk fallback) that opens the account menu: Profile and settings, Billing, Help and support, Sign out. Every control has a 2px Flame focus outline. A "Skip to content" link (Flame, On Flame text) appears on focus.
- **Phone menu:** below 768px a 44px menu button opens a right-side Sheet on Night (85vw, max 24rem): the account header, a flame "Book a detail", the five links and an "Account" group as 48px rows with the same white/12 active pill, and Sign out at the bottom above the safe-area inset.
- **Phone dock (`ActionDock`):** labelled "Quick actions". Three equal 56px items (20px icon over a 0.75rem semibold label, 14px corners): Book, Show at bay or Bookings, and Shop. One item is flame according to the One Flame Rule. The others are white text with a white/10 hover. Focus is a 2px Flame outline. Hidden from 1024px.

### Site Card
The facts someone checks before driving over, in the home's side column (below the visits on phones). A white surface (20px padding, Line ring) headed by the address in 900 weight, then a definition list: Self-service bays "Open 24/7" with the sky Droplets icon, Express detailing "Thu–Sun, 9:30 AM–6:30 PM" with the flame Sparkles icon. Under a Line Soft divider, three 44px links with Line Soft hover and Brand Blue focus: "Get directions" and "Shop car care" with Brand Blue icons, and a muted "Weather and closure policy".

### License Plate (signature)
A plate drawn as a plate. White ground, 1px Line border, 5px corners, Ink characters in Geist Mono 600, uppercase and widely tracked, with the Plate edge shadow. Screen readers hear "License plate" before the characters. It comes in two sizes: inline in the pass's vehicle list, and XL on the full-screen bay pass.

### Member Pass (signature)
The membership as an object you show someone. It is a Night surface with Pass lift. The plan name is in Display. The kind and status line is semibold, with the kind tinted by service (red-soft for express membership, sky for self-service) and the status in On Night Muted, or Flame when cancelling. An optional description sits in On Night Subtle at 65ch. Vehicles are listed between white/10 dividers, with a flame star and "Primary vehicle" on the primary car and plates aligned to the right. The flame "Show at the bay" button opens the **Bay Pass**: a full-viewport Night dialog with no corners and no entry animation under reduced motion, the holder's name in Bay Display, the plan and status at 1.25–1.5rem, and XL plates.

### Now Card
The single most time-sensitive item, shown as a Dusk surface. It covers four cases: a bay session in progress, the next detail (date and time as Display, the service name tinted Flame, Directions plus "View or change"), an order ready or on its way, or an idle prompt to book. For a brand-new customer it is replaced by the Welcome card on Night, which shows three photographed service rows tinted sky / flame / red and one flame "Book your first detail".

### Visits List
A white surface titled "Your visits". Rows are separated by Line Soft dividers. Each row starts with its service icon in a 32px Canvas circle with a Line ring (Sparkles in Detailing Mark for a detail, Droplets in Sky Mark for a bay visit, a neutral Ink Subtle ShoppingBag for a product order), with the service named for screen readers, then a tabular date and a semibold Ink title with an Ink Muted detail line. Detail rows carry row actions. Every link and button on white uses the Brand Blue focus outline.

### Inputs / Fields
The home has no fields of its own. Inside `.lp-theme`, shadcn inputs and the review dialog pick up Line borders, navy text and a Brand Blue ring. New fields in this world should keep that (44px height, Line ring, Brand Blue focus) rather than invent a style.

## Do's and Don'ts

### Do:
- **Do** give each viewport exactly one Flame filled control with On Flame (navy) text. Turn every other action quiet (transparent with a white/20 outline on navy, ghost or ringed on white).
- **Do** use the semantic token utilities from `app/globals.css` (`bg-night`, `text-on-night-muted`, `bg-flame`, `text-svc-member` …) and put new customer pages inside `.lp-theme`.
- **Do** put identity and time-sensitive content (pass, next appointment, check-in) on Night or Dusk. Put history, site facts and requests on white 16px-corner surfaces with a 1px Line ring.
- **Do** tint by service and nothing else: sky = self-service, flame = express detailing, red = membership. Use the plain token for text on navy and the `-mark` token for icons on white, and pair the colour with an icon or a name.
- **Do** set dates, plan names and greetings in Geist 900 with -0.025em tracking (-0.035em on the hero), with balanced wrapping and dates kept on one line.
- **Do** draw license plates with the License Plate component. That is the only use of Geist Mono.
- **Do** keep every target at least 44px tall (nav links 40px, dock 56px, sheet rows and bay "Done" 48px), and give focus a 2px outline: Flame on navy, Brand Blue with a 2px offset on white.
- **Do** respect reduced motion. `MotionConfig reducedMotion="user"` is global, and add `motion-reduce:animate-none` / `transition-none` to any pulse, dialog entrance or arrow nudge. Content must start visible.
- **Do** show placeholders while data loads and an inline error card with "Try again" on failure, so "nothing booked" is never shown as a guess.
- **Do** keep the seasonal brand treatment. The Christmas logo (`/public/xmas-launchpad-logo.png`) and the snow effect (`components/snow-effect.tsx`, currently commented out in `app/layout.tsx`) are deliberate brand commitments (PRODUCT.md), not dead code.

### Don't:
- **Don't** put an eyebrow or kicker label above a heading. The heading carries itself.
- **Don't** build stat-card or hero-metric grids ("Total Bookings", big number + small label). The home is a pass and a next move.
- **Don't** invent numbers, counts, ratings or "+N from last week" notes. Show only real data (PRODUCT.md, "Only claim what is true").
- **Don't** use coloured side borders (a `border-left` / `border-right` stripe over 1px) on cards, rows, callouts or alerts. Use an icon or a text tint.
- **Don't** fill a surface with a service colour, and don't add a second flame-filled button to a screen that already has one.
- **Don't** write raw palette classes (slate, amber, violet, blue-900) in customer-world code, and don't use black or slate for the night. The night is logo navy.
- **Don't** offer the same action twice on one screen (the desktop home has no action rail because the navbar has "Book").

### Divergences (as built, not yet unified)
- **Inner customer pages** (bookings, billing, orders, pricing, settings, self-service log) sit in the new navbar and `.lp-theme`, so their shadcn controls are navy, but their own markup still carries gray and blue-900 classes.
- **The marketing hero** (`components/user/hero.tsx`) is not on the tokens. It still draws the old world with raw slate-950/900, amber-400 CTA (slate-950 text, amber-500 glow), violet for membership and a fourth hue (emerald-400) on perk checks. Its service cards carry eyebrow labels ("DIY", "Most Popular", "Best Value"). New work follows the tokens and bans, not this instance.
- **The marketing home below the hero** (`app/(user)/(home)/page.tsx`) returns to white with blue-900 headings, blue-700 checks and links, and shadcn cards. It also shows the unverified "4.9/5 From 500+ Reviews" badge, which PRODUCT.md says must not be amplified. The marketing navbar (`components/user/navbar.tsx`) is the older style ("Premium Car Care" tagline in blue-600, blue-900 "Book Online").
- **The product store** (`/products`) is its own scoped world. The `.storefront` class swaps shadcn tokens for near-black with Storefront Gold as `--primary`, and headlines use Anton (`.font-display`, loaded only in `app/(user)/products/layout.tsx`, weight 400, tracking 0.01em, never for body or UI labels).
- **The admin console** (`app/admin`, `AdminShell`) is not on the tokens: shadcn sidebar tokens on the neutral theme with blue-900 / blue-800 as the main accent and green/red status tints.
