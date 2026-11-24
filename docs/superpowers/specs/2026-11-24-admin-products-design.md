# Admin products and inventory (short design)

Date: 2026-11-24. Status: the user approved the mockup ("looks right, go ahead").

## Intent
`/admin/products` serves two jobs on one screen:
- **Receiving and correcting stock**, in seconds, from the list.
- **Editing listings**, in a sectioned drawer.

The critique scored it 24/40. Problems it found:
- three jobs on one page;
- restocking buried in the full edit form;
- 12 fields at once, with unsaved edits lost on close;
- free-text category;
- four words for "visible";
- unlabeled icon buttons;
- `window.confirm` for delete;
- off-token colours.

## Decisions
- **Tabs:** **Products** and **Storefront**. Storefront holds `StorefrontHeroSettings`, unchanged. Products is the default.
- **Header:**
  - The `h1` "Products" and a Night "+ Add product" button, which opens the drawer empty.
  - One line of counts replaces the six stat tiles (`ProductStats` is deleted): "N products · X out of stock · Y running low · Z need content". Each count is a button that applies its chip.
- **Toolbar:** a 44px search over name, short name and category, plus chips with counts: All · Low stock · Out of stock · Needs content · Hidden.
  - Low = 1..`LOW_STOCK_THRESHOLD`. Out = 0.
  - Needs content = missing photo, video or description (the same rule as `contentGaps`).
- **List** (a table from `md`, cards below it):
  - **Product:** a 48px thumbnail, the short name (`productTitle`) in bold, the full name muted and truncated, and "Needs: …" (photo, video, description, plus "short name" when the full name is longer than 48 characters and no short name is set).
  - **Category.**
  - **Price.**
  - **Stock:** the count in 900 weight, a Low or Out tag, and "+ Receive".
  - **In the shop:** a Switch labelled Shown or Hidden, with `aria-label` "Show {title} in the shop".
  - **Actions:** a labelled "Edit" button and a "More" menu (Hide or Show, Delete…).
  - **Order:** `sort_order`, then newest.
- **Receive stock:** a popover with a number input and "Adds to the {n} on hand, making {total}". The primary button is "Add {k} to stock".
  - A "Set exact count" toggle switches the same popover to set mode (0–100000), with the primary "Set count to {k}".
  - Writes are a guarded update: `.eq("stock", current)`. If no row matches, show "Stock just changed. Refreshed." and reload.
- **Delete:** an AlertDialog: "Delete {title} permanently? Hiding it is usually enough; past orders keep their own copy of the name and price."
- **Edit drawer:** a right-side Sheet, `sm:max-w-lg`, with sections:
  - **Basics:** Name (help: page title, search engines, receipts), Short name (optional, at most 60 characters), Category (an input with a `datalist` of existing categories), Description (help about "Label: value" lines becoming Specs).
  - **Price and stock:** price, sale price (optional), stock on hand.
  - **Photos and video:** the existing main image, gallery (batch upload with progress) and video uploaders, moved as they are.
  - **In the shop:** Shown, Featured at the top, Sort order.
  - **Footer:** Cancel / "Save changes" ("Add product" when creating).
  - **Unsaved changes:** closing a dirty form asks first ("Discard your changes?").
  - **Saving:** create keeps `uniqueSlug` and the 23505 message. Update never changes the slug.
- **Pure helpers, tested:**
  - `lib/admin/productForm.ts`: the form type, `EMPTY_FORM`, `formFromProduct`, `buildProductPayload` (the current validation plus `display_name`) and `isDirty`.
  - `lib/admin/productsList.ts`: chips, counts, search, needs, and the stock maths.
- **Tokens only:** light admin tokens (Canvas page, white surfaces, Night primary, Brand Blue focus), `lp-theme`, and 44px targets.

## Approaches
1. **Picked: split the 940-line `products-view.tsx`** into a container, `ProductsList` and `ProductDrawer`, with pure helpers. It's testable, and each file has one job.
2. **Rejected: restyle in place.** It keeps one 940-line file and leaves the logic untested.

## Left to the builder
The exact classes, and internal component boundaries beyond the three above.
