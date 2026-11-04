---
name: The Launch Pad
description: Car wash, self-service bays and express detailing at 10410 S Main St, Houston; one roof, one flow.
colors:
  signal-amber: "oklch(82.8% 0.189 84.429)"
  signal-amber-bright: "oklch(87.9% 0.169 91.605)"
  signal-ink: "oklch(27.9% 0.077 45.635)"
  self-service-sky: "oklch(82.8% 0.111 230.318)"
  self-service-sky-dot: "oklch(74.6% 0.16 232.661)"
  membership-violet: "oklch(81.1% 0.111 293.571)"
  membership-violet-dot: "oklch(70.2% 0.183 293.541)"
  night: "oklch(12.9% 0.042 264.695)"
  dusk: "oklch(20.8% 0.042 265.755)"
  graphite: "oklch(27.9% 0.041 260.031)"
  pale-steel: "oklch(96.8% 0.007 247.896)"
  mist: "oklch(92.9% 0.013 255.508)"
  haze: "oklch(86.9% 0.022 252.894)"
  fog: "oklch(70.4% 0.04 256.788)"
  pewter: "oklch(55.4% 0.046 257.417)"
  slate-text: "oklch(44.6% 0.043 257.281)"
  slate-body: "oklch(37.2% 0.044 257.287)"
  paper: "#ffffff"
  canvas: "oklch(98.5% 0.002 247.839)"
  legacy-navy: "oklch(37.9% 0.146 265.522)"
  storefront-gold: "oklch(0.8 0.132 86)"
  shadcn-primary: "oklch(0.205 0 0)"
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
  rail: "288px"
components:
  button-primary:
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.label-action}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.signal-amber-bright}"
    textColor: "{colors.signal-ink}"
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
    backgroundColor: "{colors.graphite}"
  button-ghost-light:
    backgroundColor: "transparent"
    textColor: "{colors.slate-body}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ghost-light-hover:
    backgroundColor: "{colors.pale-steel}"
  row-action:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
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
    textColor: "{colors.night}"
    rounded: "{rounded.surface}"
    padding: "20px"
  license-plate:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
    typography: "{typography.plate}"
    rounded: "{rounded.plate}"
    padding: "2px 8px"
  license-plate-xl:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night}"
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
    backgroundColor: "{colors.signal-amber}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.dock-label}"
    rounded: "{rounded.tile}"
    height: "56px"
---

# Design System: The Launch Pad

## Overview

**Creative North Star: "The 24/7 Bay"**

The customer world looks like the site after dark: deep slate surfaces, white type, and one amber light that marks where to go next. It was built for a person standing at 10410 S Main St with a phone in one hand (see PRODUCT.md for who uses the product and why). The membership pass, the next appointment and the thumb dock are the bay at night. History, site facts and requests sit on plain white cards next to the dark blocks. That is the whole tonal story: dark for what matters now and who you are, white for everything you might read later.

The world is shared by the marketing hero (`components/user/hero.tsx`) and the new customer dashboard home (`app/(dashboard)/dashboard/page.tsx`, on branch `feat/dashboard-home`). The page's opening comment is the direction contract. It rejects the stock stat-card grid and the "Welcome back" scaffold, and it makes the home "the customer's pass and their next move." Display type is Geist at its heaviest weight (900) with tight tracking. Monospace appears only on license plates, which are drawn as real white plates so an attendant can match them by eye. Three service hues act as a legend, not decoration: sky for self-service, amber for express detailing, violet for membership.

This document records what is built, and the product is not yet one world. The brand colors are **Tailwind palette utilities, not design tokens**. `app/globals.css` still carries the neutral shadcn `--primary` (near-black, see `shadcn-primary`), so any shadcn `Button` left at its default renders gray-black, not amber. The frontmatter colors are Tailwind v4's own OKLCH values for the utilities the code uses, and each one below gives its utility name in parentheses because that is how the code expresses it. Several surfaces still use older looks and are listed under Divergences in Do's and Don'ts.

**Key Characteristics:**
- Slate-night and slate-dusk surfaces for identity and time-sensitive content. White cards with a hairline ring for history, site info and requests.
- One amber-filled action per viewport. Every other control is quiet.
- Service hues sky / amber / violet used as text tints and small dots, never as fills.
- Geist Sans at 900 weight with tight tracking for dates, plan names and greetings.
- Geist Mono only on license plates, which are drawn as physical white plates.
- 44px minimum touch targets, 56px dock targets, visible focus outlines tuned to the surface.
- Reduced motion respected globally (`MotionConfig reducedMotion="user"`) and per element (`motion-reduce:`).

## Colors

The palette is cool slate darks and whites, with one warm amber signal and three service tints.

### Primary
- **Signal Amber** (amber-400): the one filled call to action on screen. Examples are "Show at the bay" on the member pass, "Book a detail" for non-members, the amber dock item and the hero's "Book online". Also used for the primary-vehicle star.
- **Signal Amber Bright** (amber-300): the hover state of Signal Amber, the focus outline color around amber-filled buttons, and the text tint for "cancelling" status lines and for the express-detailing service name.
- **Signal Ink** (amber-950): text and icons on Signal Amber. On the marketing hero the CTA uses night (slate-950) text on amber instead. Both pass contrast. The dashboard uses Signal Ink.

### Secondary
- **Self-service Sky** (sky-300): text tint for self-service. Used for the "Self-service plan" kind line, the "Self-service bay" check-in line, the welcome service list and the hero card accent.
- **Self-service Sky Dot** (sky-400): the 10px dot that marks a bay visit in the visits list, and the hero card's top rule.

### Tertiary
- **Membership Violet** (violet-300): text tint for membership ("Express membership", "Unlimited membership", the hero's "Unlimited Wash Plans" accent).
- **Membership Violet Dot** (violet-400): the visits-list dot. As built, it marks **product orders**, not membership visits. Violet therefore also stands for orders in that list.

Express detailing has no hue of its own. It uses the amber family (amber-300 text, amber-400 dot), so its tints are always text or a dot and never a filled block. Filled amber stays the action.

### Neutral
- **Night** (slate-950): the member pass, welcome card, desktop action rail, inline error card, full-screen bay pass, phone dock (at 95% opacity), marketing hero ground. Also the text color on white surfaces and the focus outline color on light surfaces.
- **Dusk** (slate-900): the Now card. It is one step lighter than Night so it reads as a separate block when it sits under the pass. At 90% opacity it is also the dark skeleton color, and at 80% the hero service cards.
- **Graphite** (slate-800): hover state of the solid dark button on white surfaces, and row-action text.
- **Pale Steel** (slate-100): dividers between visit rows and the hover fill of ghost buttons on white.
- **Mist** (slate-200): the 1px ring around white surfaces and row actions, light skeletons, and secondary text on the full-screen pass.
- **Haze** (slate-300): secondary text on dark surfaces (Now card detail lines, welcome descriptions, the Manage link) and the license-plate border.
- **Fog** (slate-400): tertiary text on dark (plan description, the " · " separator, the welcome-row arrow).
- **Pewter** (slate-500): visit dates in the white visits list.
- **Slate Text** (slate-600): secondary text on white (visit detail lines, empty states, opt-in body).
- **Slate Body** (slate-700): body and link text on white (site strip, "All bookings", ghost button text).
- **Paper** (white): white surfaces, plate ground and text on dark.
- **Canvas** (gray-50): the page background behind the whole dashboard (`app/(dashboard)/layout.tsx`). Dark blocks and white cards both sit on it.
- **White hairlines**: borders on dark surfaces are white at low alpha. A 10% ring (white/10) goes on every dark surface and dock top border, 20% outlines quiet buttons, and 25–30% outlines the error retry and bay "Done". These are alpha values, not tokens.

### Legacy and scoped colors (not part of this world)
- **Legacy Navy** (blue-900): the older customer and marketing accent. Still on the marketing body below the hero, both navbars' "Book Online" buttons, the bookings/billing/orders/settings/self-service-log pages, most of the admin console, and the blog link color in `globals.css`.
- **Storefront Gold** (`--gold`, with `--gold-soft` / `--gold-deep`): a real CSS token, applied only inside `.storefront` on `/products`, where it becomes `--primary`.
- **shadcn Primary** (`--primary`): neutral near-black. It is not a brand color. It is what an unstyled shadcn control shows.

### Named Rules
**The One Amber Rule.** Exactly one amber-filled control per viewport. When a member pass is on screen, it owns the amber ("Show at the bay"). The Now card's actions then turn quiet (`hasPass`), the desktop rail's "Book a detail" goes quiet, and the phone dock gives its amber slot to "Show at bay". Without a pass, "Book" takes the amber.

**The Hue Is a Legend Rule.** Sky, amber and violet tell you which service you are looking at. They appear as text tints (the -300 shades) and 10px dots (the -400 shades) and never as surface fills. Amber fill is reserved for the action.

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
- **Title** (900, 1.25rem): headings of white sections ("Your visits"). Bold (700) at 1rem for small white-card headings such as the opt-in question and welcome service names. The site strip's address is semibold (600).
- **Body** (400, 1rem, line-height 1.5): detail lines under display headings. Descriptions use 0.875rem with relaxed leading (1.625), capped at `max-w-prose` (65ch).
- **Label** (600 for quiet controls and status lines, 700 for amber-filled controls, 1rem; 0.875rem for row actions and links): button and link text, sentence case.
- **Dock Label** (600, 0.75rem): the icon-over-label phone dock items.
- **Plate** (Geist Mono 600, uppercase, 0.875rem, tracking 0.12em; XL: 1.875rem, 2.25rem from 640px, tracking 0.14em): license plates only.
- Visit dates use **tabular numerals** (semibold, 0.875rem, Pewter) in a fixed 56px column.

### Named Rules
**The Black Weight Rule.** Display moments in this world (dates, plan names, the greeting, section titles) are Geist at 900 with tight tracking. They are never bold-700 headings in a second family.

**The Mono Is a Plate Rule.** Geist Mono is for license plates, not for prices, IDs or "technical" flavor.

## Layout

**Dashboard home.** The page sits in the dashboard shell (`container mx-auto px-4 py-8`, content capped at 80rem) on the Canvas background. Below 1024px it is one column with 24px between blocks: greeting, pass(es), Now card, visits, site strip, then the opt-in row last. From 1024px it becomes a two-column grid, a flexible main column (`minmax(0,1fr)`) plus a fixed 288px (18rem) side rail with a 24px gap, aligned to the top. The rail is sticky at 96px from the top and holds the action panel and the site strip. The opt-in row stays last at every size, and on desktop it is limited to the main column's width (`calc(100% - 19.5rem)`).

**Phone dock.** Below 1024px a fixed bottom dock replaces the rail. It is centered with a 28rem maximum width, uses 8px gaps between three equal items, has 12px side padding, and keeps the safe-area inset at the bottom (`max(0.5rem, env(safe-area-inset-bottom))`). The page adds 112px of bottom padding so content is not hidden behind it.

**Surface padding.** Dark and white surfaces use 20px padding, 28px from 640px. The rail panel and site strip use 16px. Stacks inside the rail use 8px (actions) and 16px (panel to strip).

**Marketing hero.** The section is full-bleed at `min-h-svh` with a photograph (`/self-service.png`) under a night scrim gradient (70% → 65% → 90%). Content is capped at 80rem with 20px / 32px gutters and 96px / 128px top padding. The service picker becomes three columns from 768px with 16px gaps.

**Breakpoints in use:** 640px (type steps, padding), 768px (hero grid), 1024px (rail versus dock), 1280px (marketing navbar collapse).

## Elevation & Depth

The world is mostly flat. Depth comes from tone: Canvas → white card with a 1px Mist ring, or Canvas → Night/Dusk block with a 1px white/10 ring. Dusk sitting under Night separates the Now card from the pass without a shadow. Only two shadows exist in the dashboard world, and both have a physical reason.

### Shadow Vocabulary
- **Pass lift** (`box-shadow: 0 18px 40px -24px rgb(2 6 23 / 0.9)`): under the member pass only. It is a long, soft, downward shadow that makes the pass read as a card you hold.
- **Plate edge** (`box-shadow: 0 1px 0 rgb(0 0 0 / 0.25)`): a 1px bottom lip under license plates, like a stamped metal edge.
- **Hero CTA glow** (Tailwind `shadow-lg` tinted amber-500 at 20%): marketing hero "Book online" only.

The phone dock is the one translucent surface: Night at 95% with `backdrop-blur`, so content scrolling behind it is still faintly visible.

### Named Rules
**The Tone-Not-Shadow Rule.** Separate blocks by surface tone (Canvas / white / Dusk / Night) and hairline rings. Add a shadow only when the object is physical (the pass, a plate).

## Shapes

Corners are generous and consistent, with radius by role. Surfaces use 16px (`rounded-2xl`). Dock items and welcome service rows use 14px (`rounded-xl`, which the project's `--radius` makes `0.625rem + 4px`). Buttons use 10px (`rounded-lg`, which equals `--radius`). The pass's "Manage" link uses 8px. Plates use a deliberate 5px so they look like plates, not pills. The full-screen bay pass has no rounding and fills the viewport (`h-dvh`, `rounded-none`). Welcome-row thumbnails are photographs cropped to 96×72 with 10px corners.

Borders are 1px hairlines everywhere: rings around surfaces, dividers between vehicle rows (white/10) and visit rows (Pale Steel), and outlines on quiet buttons. The marketing hero cards add a 1px colored top rule in the service hue. Nothing uses a thick colored side stripe.

## Components

### Buttons
Big targets, few of them, and only one of them loud.
- **Shape:** gently rounded (10px), at least 44px tall, icon + label with 8px gap, sentence case.
- **Primary (amber):** Signal Amber fill, Signal Ink text, bold label, 20px horizontal padding (16px in the rail). Full width on phones under the pass, auto width from 640px.
- **Hover / Focus:** hover changes to Signal Amber Bright with a color transition (150ms). Focus is a 2px Signal Amber Bright outline offset by 2px.
- **Quiet on dark:** transparent, white semibold text, 1px white/20 outline (the rail versions have no outline). Hover adds a white/10 fill. Focus is a 2px Signal Amber outline.
- **Solid on light:** Night fill, white text, Graphite on hover. 60% opacity when disabled. Focus is a 2px Night outline offset 2px. Used for "Yes, email me".
- **Ghost on light:** Slate Body text, Pale Steel hover fill. Used for "No thanks".
- **Row action (on light):** 44px tall, 12px padding, 0.875rem semibold Graphite text, 1px Mist ring, very light slate-50 hover. Used for "Book again" and "How was it?".
- **Bay "Done":** 48px tall, 24px padding, white/30 outline, on the full-screen pass.

### Cards / Containers
- **Corner Style:** 16px on every surface.
- **Background:** Night for the member pass, welcome card, rail panel and error card. Dusk for the Now card. Paper for visits, site strip and opt-in.
- **Shadow Strategy:** none, except Pass lift on the member pass (see Elevation & Depth).
- **Border:** a 1px ring, white/10 on dark and Mist on white.
- **Internal Padding:** 20px, 28px from 640px. 16px in the rail.
- **Loading:** placeholders take the shape and tone of what they replace (Dusk at 90% for dark blocks, Mist for light ones) and pulse only when motion is allowed.
- **Error:** an inline Night card with `role="alert"` that names what failed ("Couldn't load your membership.") and offers a quiet "Try again". It never falls back to a misleading empty state.

### Navigation
- **Phone dock (`ActionDock`):** labelled "Quick actions". Three equal 56px items (icon 20px over a 0.75rem semibold label, 14px corners): Book, Show at bay or Bookings, and Shop. One item is amber according to the One Amber Rule. The others are white text with a white/10 hover. Focus is a 2px Signal Amber outline. Hidden from 1024px.
- **Desktop rail:** the same actions as 44px rows inside a Night panel, followed by the white site strip (address, bay hours, detailing hours, and a policy link with a Night focus outline).
- **Customer navbar (`AuthNavbar`):** only partly in this world. It has the logo (`/thelaunchpad.png`, 40px) plus a "THE LAUNCH PAD" wordmark in 900-weight Night (shown from 1024px), and a Night focus outline on the logo link. The rest is the older style: gray links with a 2px bottom border marking the active one, a white/95 blurred bar once scrolled, and a **blue-900 uppercase "Book Online" button**. On the dashboard home that button sits next to the amber action (see Divergences).

### License Plate (signature)
A plate drawn as a plate. White ground, 1px Haze border, 5px corners, Night characters in Geist Mono 600, uppercase and widely tracked, with the Plate edge shadow. Screen readers hear "License plate" before the characters. It comes in two sizes: inline in the pass's vehicle list, and XL on the full-screen bay pass.

### Member Pass (signature)
The membership as an object you show someone. It is a Night surface with Pass lift. The plan name is in Display. The kind and status line is semibold, with the kind tinted by service (violet for express membership, sky for self-service) and the status in slate-200, or Signal Amber Bright when cancelling. An optional description sits in Fog at 65ch. Vehicles are listed between white/10 dividers, with an amber star and "Primary vehicle" on the primary car and plates aligned to the right. The amber "Show at the bay" button opens the **Bay Pass**: a full-viewport Night dialog with no corners and no entry animation under reduced motion, the holder's name in Bay Display, the plan and status at 1.25–1.5rem, and XL plates.

### Now Card
The single most time-sensitive item, shown as a Dusk surface. It covers four cases: a bay session in progress, the next detail (date and time as Display, the service name tinted amber, Directions plus "View or change"), an order ready or on its way, or an idle prompt to book. For a brand-new customer it is replaced by the Welcome card on Night, which shows three photographed service rows tinted sky / amber / violet and one amber "Book your first detail".

### Visits List
A white surface titled "Your visits". Rows are separated by Pale Steel dividers. Each row has a 10px service dot (sky-400 bay visit, amber-400 detail, violet-400 order), a tabular date, and a semibold title with a Slate Text detail line. Detail rows carry row actions. Every link and button on white uses the Night focus outline.

### Inputs / Fields
The new world has no field styling of its own yet. The opt-in uses buttons only, and the review form is a shadcn dialog with the neutral shadcn tokens. New fields in this world should take the white-surface rules above (Mist ring, Night focus outline, 44px height) rather than invent a style.

## Do's and Don'ts

### Do:
- **Do** give each viewport exactly one Signal Amber filled control with Signal Ink text. Turn every other action quiet (transparent with a white/20 outline on dark, ghost or ringed on white).
- **Do** put identity and time-sensitive content (pass, next appointment, check-in, actions) on Night or Dusk. Put history, site facts and requests on white 16px-corner surfaces with a 1px Mist ring.
- **Do** tint by service and nothing else: sky = self-service, amber = express detailing, violet = membership (and, in the visits list, product orders). Use -300 for text and -400 for dots.
- **Do** set dates, plan names and greetings in Geist 900 with -0.025em tracking (-0.035em on the hero), with balanced wrapping and dates kept on one line.
- **Do** draw license plates with the License Plate component. That is the only use of Geist Mono.
- **Do** keep every target at least 44px tall (dock 56px, bay "Done" 48px), and give focus a 2px outline: Signal Amber on dark, Night with a 2px offset on white.
- **Do** respect reduced motion. `MotionConfig reducedMotion="user"` is global, and add `motion-reduce:animate-none` / `transition-none` to any pulse, dialog entrance or arrow nudge. Content must start visible.
- **Do** show placeholders while data loads and an inline error card with "Try again" on failure, so "nothing booked" is never shown as a guess.
- **Do** keep the seasonal brand treatment. The Christmas logo (`/public/xmas-launchpad-logo.png`) and the snow effect (`components/snow-effect.tsx`, currently commented out in `app/layout.tsx`) are deliberate brand commitments (PRODUCT.md), not dead code.

### Don't:
- **Don't** put an eyebrow or kicker label above a heading. The heading carries itself.
- **Don't** build stat-card or hero-metric grids ("Total Bookings", big number + small label). The home is a pass and a next move.
- **Don't** invent numbers, counts, ratings or "+N from last week" notes. Show only real data (PRODUCT.md, "Only claim what is true").
- **Don't** use colored side borders (a `border-left` / `border-right` stripe over 1px) on cards, rows, callouts or alerts. Use a 10px dot or a text tint.
- **Don't** fill a surface with a service hue, and don't add a second amber-filled button to a screen that already has one.
- **Don't** leave a shadcn `Button` on its default variant in this world. `--primary` is still neutral near-black. Style it to the amber, quiet or light variants above.
- **Don't** use blue-900 in new customer-world work. It is the legacy accent.

### Divergences (as built, not yet unified)
- **Other customer dashboard pages** (bookings, billing, orders, settings, self-service log) are still the older light gray look with blue-900 accents and shadcn defaults.
- **The customer navbar** is mixed: it has the new logo and wordmark but keeps the blue-900 uppercase "Book Online" button and gray links. Its mobile menu items have a 4px left border that turns gray-300 on hover.
- **The marketing home below the hero** (`app/(user)/(home)/page.tsx`) returns to white with blue-900 headings, blue-700 checks and links, and shadcn cards. It also shows the unverified "4.9/5 From 500+ Reviews" badge, which PRODUCT.md says must not be amplified. The marketing navbar is the same older style ("Premium Car Care" tagline in blue-600, blue-900 "Book Online").
- **The marketing hero itself** predates the bans. Its service cards carry eyebrow labels ("DIY", "Most Popular", "Best Value") over their headings, the "Choose your experience" heading is small uppercase tracked text, and the perk checks add a fourth hue (emerald-400). New work follows the bans, not these instances.
- **The product store** (`/products`) is its own scoped world. The `.storefront` class swaps shadcn tokens for near-black with Storefront Gold as `--primary`, and headlines use Anton (`.font-display`, loaded only in `app/(user)/products/layout.tsx`, weight 400, tracking 0.01em, never for body or UI labels).
- **The admin console** (`app/admin`, `AdminShell`) has its own look: shadcn sidebar tokens on the neutral theme with blue-900 / blue-800 as the main accent and green/red status tints.
