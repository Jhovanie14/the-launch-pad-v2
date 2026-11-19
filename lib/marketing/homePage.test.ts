import { describe, expect, it } from "vitest";
import { HOME_REASONS, HOME_REVIEWS } from "./homePage";

describe("home page copy", () => {
  it("reasons are the four approved facts", () => {
    expect(HOME_REASONS).toEqual([
      { title: "Open around the clock", detail: "Self-service bays, 24/7" },
      { title: "Pro equipment", detail: "High-pressure wash, foam brush, spot-free rinse" },
      { title: "Detailing by appointment", detail: "Thursday to Sunday, booked online" },
      { title: "Memberships, no contract", detail: "Monthly or yearly, cancel anytime" },
    ]);
  });

  it("three reviews, one per service line", () => {
    expect(HOME_REVIEWS.map((r) => r.author)).toEqual(["Ahmed S.", "Maria G.", "Jason T."]);
    expect(HOME_REVIEWS[0].text).toMatch(/self-wash/);
    expect(HOME_REVIEWS[1].text).toMatch(/express detailing/);
    expect(HOME_REVIEWS[2].text).toMatch(/membership/);
    for (const r of HOME_REVIEWS) expect(["Google", "Yelp"]).toContain(r.source);
  });
});
