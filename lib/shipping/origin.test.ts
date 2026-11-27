import { describe, expect, it } from "vitest";
import { SHIP_FROM } from "./origin";

describe("SHIP_FROM", () => {
  it("is the owner's ship-from address, as USPS confirmed it", () => {
    expect(SHIP_FROM).toMatchObject({ street1: "3535 Omeara Dr", city: "Houston", state: "TX", zip: "77025", country: "US" });
  });
});
