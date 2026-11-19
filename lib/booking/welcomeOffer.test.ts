import { describe, expect, it } from "vitest";
import { welcomeOfferFromPromo } from "./welcomeOffer";

const live = {
  code: "WELCOME10",
  is_active: true,
  applies_to: "one_time",
  discount_type: "percent",
  discount_percent: 10,
  max_uses: null,
  used_count: 0,
  restricted_to_service: null,
};

describe("welcomeOfferFromPromo", () => {
  it("live percent code → { code: 'WELCOME10', percent: 10 }", () => {
    expect(welcomeOfferFromPromo(live, 0)).toEqual({ code: "WELCOME10", percent: 10 });
  });

  it("inactive → null", () => {
    expect(welcomeOfferFromPromo({ ...live, is_active: false }, 0)).toBeNull();
  });

  it("flat code → null", () => {
    expect(welcomeOfferFromPromo({ ...live, discount_type: "flat", discount_percent: null }, 0)).toBeNull();
  });

  it("service-restricted → null", () => {
    expect(welcomeOfferFromPromo({ ...live, restricted_to_service: "classic complete" }, 0)).toBeNull();
  });

  it("applies only to subscriptions → null", () => {
    expect(welcomeOfferFromPromo({ ...live, applies_to: "subscription" }, 0)).toBeNull();
  });

  it("max_uses reached by redemption rows → null", () => {
    expect(welcomeOfferFromPromo({ ...live, max_uses: 5, used_count: 0 }, 5)).toBeNull();
  });

  it("under max_uses → offer", () => {
    expect(welcomeOfferFromPromo({ ...live, max_uses: 5 }, 4)).toEqual({ code: "WELCOME10", percent: 10 });
  });

  it("missing promo → null", () => {
    expect(welcomeOfferFromPromo(null, 0)).toBeNull();
  });

  it("percent 0 or null → null", () => {
    expect(welcomeOfferFromPromo({ ...live, discount_percent: 0 }, 0)).toBeNull();
    expect(welcomeOfferFromPromo({ ...live, discount_percent: null }, 0)).toBeNull();
  });
});
