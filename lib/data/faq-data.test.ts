import { describe, expect, it } from "vitest";
import { faqData } from "./faq-data";

/**
 * Mirrors the derivation in components/faq-section.tsx: category order on the
 * page is the order each category first appears in this array. Nothing else
 * enforces it, so a reordering edit could silently push a category down.
 */
const categoryOrder = Array.from(new Set(faqData.map((faq) => faq.category)));

describe("faqData ordering", () => {
  it("renders Detailing Hours first", () => {
    // The printed QR code points at bare /faq, so the hours answers have to be
    // the first thing on the page — there is no anchor to scroll them up.
    expect(categoryOrder[0]).toBe("Detailing Hours");
  });

  it("leads that category with the schedule itself, not the explanation", () => {
    const first = faqData.find((faq) => faq.category === "Detailing Hours");
    expect(first?.answer).toContain("Thursday through Sunday");
    expect(first?.answer).toContain("9:30 AM to 6:30 PM");
  });
});

describe("faqData consistency", () => {
  it("never claims a notice period for membership cancellation", () => {
    // Cancelling just flips cancel_at_period_end (see the self-service cancel
    // route and components/self-service-subscription-status.tsx) — no notice is
    // required, and two other answers promise "cancel anytime".
    for (const faq of faqData) {
      expect(faq.answer).not.toMatch(/\d+\s*days?['’]?\s*notice/i);
    }
  });
});

describe("faqData integrity", () => {
  it("keeps every id unique", () => {
    // Duplicate ids collide as React keys and as Accordion item values, which
    // makes two entries open and close together.
    const ids = faqData.map((faq) => faq.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
