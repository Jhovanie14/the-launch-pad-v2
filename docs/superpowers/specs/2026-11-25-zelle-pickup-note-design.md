# Zelle at the counter and pickup instructions (short design)

Date: 2026-11-25. Status: the user approved the mockup ("looks good"). This is part 1. Part 2, shipping with Shippo, has its own spec.

## Intent

The owner confirmed how pickup works:
- customers collect at the carwash;
- they ask for Armando and bring an ID and proof of purchase;
- staff take cash, card or **Zelle**.

Today:
- the counter screen can't record Zelle;
- customers are never told who to ask for or what to bring.

## Goals, non-goals, anti-goals

**Goals:**
- Staff can mark a pay-at-store order paid by Zelle. Zelle shows on the order, in the collected email and in refunds.
- The owner can edit a pickup note, which customers see wherever the pickup hours show.

**Non-goals:**
- Shipping (part 2).
- Showing the note on the product page, which only shows a short hours line.
- Changing the hold or the order flow.

**Anti-goal:** saving the pickup settings, or the migration not being live yet, must never blank or break the pickup hours that are live today.

## Approaches

1. **The note is an editable setting on the `store_settings` row, next to the hours (picked).** The owner can change it when staff change, without code.
2. Fixed text in code. Rejected: naming a staff member in code means a code change and a deploy every time that person changes.
3. Fold the note into the hours text. Rejected: the 120-character hours limit, and one field doing two jobs.

## Decisions

**Database** (one migration, which the user runs):
- `product_orders.paid_via`: the check constraint gains `'zelle'`. It becomes `stripe, cash, card_reader, counter_qr, zelle`.
- `store_settings.pickup_note`: a new nullable text column, at most 200 characters, also enforced in the sanitiser.

**Zelle:**
- `PaidVia` gains `"zelle"`, with the label "Zelle".
- The counter methods become cash, card reader, Zelle, counter QR, in that order.
- **My call:** counter QR stays an option, even though the owner didn't list it, because past orders use it.
- The refusal copy becomes "Choose how they paid: cash, card reader, Zelle or counter QR."
- The counter picker becomes a 2×2 grid on phones and 4 across from `sm`.
- Refunds treat Zelle like any other store payment: staff return the money themselves.

**Pickup note:**
- `PickupSettings` gains `pickupNote: string | null`. The note is trimmed, an empty note is stored as null (hidden), and the limit is 200 characters.
- `getPickupSettings` must keep returning the hours when `pickup_note` doesn't exist yet. It selects `*`, not a named column list.
- The admin Pickup settings form gains a "Pickup instructions" textarea under the hours, with the hint "Optional. Shown under the pickup hours." The pickup route saves it with the hours and the hold.
- **Shown in** (under the hours line, and only for pickup orders):
  - the cart's pickup box;
  - `PickupPass` (on the success page and in My orders);
  - every pickup email that shows the hours today: reserved, ready, reminder, and the order confirmation that uses `hoursRow`.
- The cart's "Pay at the store" line becomes "Cash, card or Zelle when you collect…".
- The ready email's "(cash, card or QR)" becomes "(cash, card or Zelle)", so customers see the methods the owner confirmed.

**After deploy:** I set the note to "Ask for Armando at the carwash. Bring your ID and your order email or receipt." in the live admin, with the user's go-ahead.

## Rollout

The PR merges only after the user runs the migration and I confirm the column is live (same as #41).

## Left to the builder

How the note reaches the emails and staff actions: a new `pickupNote` next to every `pickupHours` dependency, or one pickup object.
