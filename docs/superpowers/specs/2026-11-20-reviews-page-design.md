# Reviews page (short design)

Date: 2026-11-20. Status: approved by the user ("yes").

## Intent

`/reviews` shows ten typed testimonials (Ahmed S., Maria G. and others) that match no real review. Its search description also claims "4.9 out of 5 from more than 500 reviews". PRODUCT.md says testimonials, names, counts and ratings must never be fabricated.

The page should show the real Google reviews (the screenshots in `public/reviews/`) in the 24/7 Bay look.

## Approaches

1. **Real reviews as text cards, on the tokens, rendered on the server (picked).** The text is readable, searchable and accessible.
2. Show the screenshots as images. Rejected: images are inaccessible, not indexable, and they carry stale "N weeks ago" dates.

## Decisions

### Data
- `lib/marketing/reviews.ts` holds `GOOGLE_REVIEWS`: the nine unique reviews (`image19` duplicates `image13`), quoted word for word.
- Names are first name plus last initial: Arsalan K., Vilma C., El guero T., Emi S., Harley Q., Uzair K., Edward A., Qassam J., Kanzah N. All are five stars.
- The same file holds `GOOGLE_REVIEW_URL` (the link the booking emails already use). The emails import it from there.
- The home page's `HOME_REVIEWS` is picked from `GOOGLE_REVIEWS` by author: Arsalan K., Vilma C., El guero T.

### Page
A server component.
- **Night top:**
  - "Customer reviews" in Display Hero;
  - "Real reviews from our Google listing, quoted word for word.";
  - one flame "Book a detail" (the shared `BookDetailButton`, which opens the booking pop-up);
  - a quiet ringed "Leave us a review" link to `GOOGLE_REVIEW_URL`, opening a new tab with `rel="noopener noreferrer"`.
- **Body:** on Canvas, white `SURFACE` cards in CSS columns (one, two from 768px, three from 1024px). Each card has:
  - five flame stars (with sr-only "5 out of 5 stars");
  - the quote;
  - the name;
  - "Google review".
- **Left out:** dates, vehicles and motion.

### Metadata
The description becomes "Real Google reviews from Houston drivers about The Launch Pad's 24/7 self-service bays, express detailing and memberships." The title stays "Customer Reviews".

### Guard
A source test fails if the page or layout contains a rating claim ("4.9", "500+", "4.4", "best price", "guarantee") or a raw palette class, or if the page is `"use client"`.

### Left to the builder
Spacing and the icons.
