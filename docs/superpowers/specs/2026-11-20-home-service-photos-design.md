# Home page: three services with real photos (short design)

Date: 2026-11-20. Status: approved by the user from the mockup ("looks right, go ahead").

## Intent

The home redesign (PR #35) removed the old "Three Amazing Services, One Location" photo cards, because the hero's tiles already list the services. The user wants that section back, using real photos of the shop.

## Approaches

1. **A new photo-card section between the hero and "Why The Launch Pad?" (picked).** It uses real photos, only facts the site already states, and links to the real pages.
2. Put the photos into the hero's navy tiles. Not chosen: the user asked for the section back.
3. Restore the old cards and their "See details" pop-up as they were. Rejected, for three reasons:
   - three of their photos are AI or stock (one carries the Gemini watermark);
   - the membership card described the self-service bays;
   - the pop-up promised things nobody has verified ("Priority scheduling", "Cancel anytime with no penalties", "Premium wax").

## Decisions

### Photos
Only real photos of the shop:
- **Self-service:** `/self-service-wash-1.jpg`, a washed black Prius in a bay.
- **Detailing:** `/professional-express-car-detailing-2.png`, a white sedan being foam-washed in the bay. This one rather than `-1`, whose plate is readable.
- **Membership:** `/express-detailing-subscription-1.jpg`, a clean car interior in the bay.

`professional-express-car-detailing.png`, `express-detailing-subscription.png` and `self-service-wash-2.jpg` are AI or stock and must not be used.

### Section
- **Placement and layout:**
  - on Canvas, between `HomeHero` and `WhyLaunchPad`;
  - a server component;
  - no prices (the hero tiles above show them).
- **Heading and lede:**
  - h2: "Three services, one location";
  - lede: "From washing it yourself to a full professional detail, it's all at 10410 S Main St."
- **Cards:** three white `SURFACE` cards in a grid (one column on phones, three from 768px). Each card has:
  - the photo at 4:3;
  - a service-mark dot (`bg-svc-*-mark`);
  - the name as an h3, a one-line lede, check-marked facts, and a quiet ringed 44px link.

### Card copy

**Self-service bays**
- Lede: "Wash it your way, any time of the day or night."
- Facts: "Open 24/7", "High-pressure wash and foam brush", "Spot-free rinse and vacuums", "Pay with coins or tap to pay".
- Link: "How the bays work" → `/self-service`.

**Express detailing**
- Lede: "Our team cleans your car inside and out."
- Facts: "Thursday to Sunday, 9:30 AM–6:30 PM", "Book online, by appointment", "Quick service and express detail packages".
- Link: "See the menu" → `/services#menu`.

**Membership**
- Lede: "Keep your car clean all month for one price."
- Facts: "Unlimited washes", "Monthly or yearly plans", "No contract, cancel anytime".
- Link: "See plans" → `/pricing`.

### Guards
- A data test pins the copy and the three real photos, and fails if any AI or stock photo is used.
- The detailing hours must match the footer's `SHOP.hours`.
- The existing home source guard (no claims, no palette classes) covers the new component automatically.

### Left to the builder
Spacing and the icons.
