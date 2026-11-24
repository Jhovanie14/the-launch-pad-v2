# Product list and product page (short design)

Date: 2026-11-24. Status: the user approved mockup v2 ("looks right, go ahead").

This is PR B of project 2, and it ends the black-and-gold `.storefront` world.

## Intent

`/products` and the product pages move to the 24/7 Bay look. Two goals:
- the products are visible on the first screen;
- "Add to cart" sits near the top of the product page.

The user asked to **keep the storefront hero**, with its admin-editable film and copy, restyled on white. Its "Explore the range" button scrolls smoothly down to the products.

## Decisions

**Hero** (`components/products/storefront-hero.tsx`):
- A Canvas section in two columns from `lg`:
  - left: the headline in Geist 900, sentence case, `text-5xl lg:text-6xl`, tracking -0.035em; the subcopy in `text-ink-muted`; the one Flame button, "{ctaLabel}" with an arrow-down icon; then three facts with Night dots ("Pick up at the shop", "Pay online or at the counter", "Held {holdDays} days once it's ready");
  - right: the film (`ProductVideo`), in a rounded-2xl Night frame with the pass lift, aspect 16/10.
- On phones, the text sits above the film.
- No eyebrow, no gold rule, no scroll chevron, no full-bleed scrim.
- The copy still comes from `store_settings`, falling back to the current defaults. The admin editor stays (project 3 moves it to its own tab).

**Scroll:** clicking the CTA calls `scrollIntoView({ behavior: "smooth" })` on `#range` and moves focus to the section heading. With `prefers-reduced-motion`, it uses `behavior: "auto"`.

**Product list:**
- `h2` "The range" (it is "Everything else" when featured products exist).
- A grid of white cards: 2 columns on phones, 3 from `lg`.
- A featured product becomes a wide card spanning two columns (image and text side by side), instead of a full-bleed dark panel.
- The category filter (`product-catalog.tsx`) keeps its threshold logic and is restyled on tokens.
- The empty state reads "No products right now. Check back soon." The old copy promised a launch.

**Card:**
- A square image on white, `object-contain`, so packshots aren't cropped.
- The title: `display_name ?? name`, 2-line clamp, semibold.
- A meta line from the parsed specs (Size and Weight values, when present).
- The price in 900 weight, with the struck-through regular price when on sale.
- A quiet 44px ringed "Add to cart". On phones it is a 44px icon button with `aria-label="Add {title} to cart"`.
- "Sold out" is a neutral chip, and the add button is disabled.
- No category eyebrow, no hover zoom, no entrance animation.

**Product page:**
- "← All products".
- Two columns from `lg`:
  - the gallery in a white surface;
  - beside it: the category (plain small text, not an eyebrow over the title; it sits under the title as metadata), the `h1` title (`display_name ?? name`), the full `name` as a muted subtitle only when a display name is set, the price, a stock line ("In stock", "Only N left", "Sold out"), a quantity stepper (44px) plus the one Flame "Add to cart", and a Pickup card (address, hours when set, "Pay by card now or at the counter when you collect. We email you when it's ready.").
- Below: "About this product" (the description paragraphs) and "Specs" (a `dl`).
- On phones, a sticky Night bar holds the price and the Flame "Add to cart"; the in-page button is hidden there.
- A video, if set, is shown inside the gallery surface, not as a full-width strip.
- "More products": up to 4 cards from the same category, or other products otherwise.

**Description parsing** (`lib/products/describe.ts`, pure, tested):
- Emoji and variation selectors are stripped.
- `Label: value` lines (a 1–24 character label of letters, spaces, `&` or `/`) become specs.
- Other non-empty lines become paragraphs.
- The stored text is never changed.

**Data:** a migration adds `products.display_name text` (nullable, at most 60 characters by check). The admin field comes in project 3; until then the full name shows, clamped. The user applies the migration.

**Cleanup:**
- `.storefront`, Anton (`storefrontFont.ts`), the `--gold` tokens and `font-display` go if nothing else uses them.
- `PriceTag` and `AddToCartButton` move to tokens.
- JSON-LD stays as it is (and uses the full `name`).
- DESIGN.md: the storefront divergence and Storefront Gold are removed, and Product list and Product page entries are added.

## Approaches

1. **Picked: restyle the existing components in place,** keeping the data flow, SEO and the editable hero.
2. **Rejected: a new compact header without the hero** (mockup v1). The user chose to keep the film.

## Left to the builder

The exact classes, within DESIGN.md and the mockup.
