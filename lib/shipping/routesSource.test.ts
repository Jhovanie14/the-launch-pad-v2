import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the shipping routes (no Next runtime in Vitest).
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const QUOTE = "app/api/products/shipping-quote/route.ts";
const CHECKOUT = "app/api/products/checkout/route.ts";

describe("shipping quote route", () => {
  it("needs a signed-in customer and a Shippo key", () => {
    const s = read(QUOTE);
    expect(s).toContain("requireUser(");
    expect(s).toContain("shippoConfigured()");
    expect(s).toContain("quoteShipping(");
    expect(s).toContain("apiError(");
  });

  it("answers GET with availability and the states we don't ship to", () => {
    const s = read(QUOTE);
    expect(s).toContain("export async function GET");
    expect(s).toContain("available:");
    expect(s).toContain("excludedStates");
  });

  it("never sends the internal rate id to the browser", () => {
    expect(read(QUOTE)).not.toMatch(/rateId\s*[,}]/);
  });
});

describe("checkout route", () => {
  it("re-prices shipping on the server and only builds the quote for shipping orders", () => {
    const s = read(CHECKOUT);
    expect(s).toContain("expectedShipping: body?.expected_shipping");
    expect(s).toContain("address: body?.address");
    expect(s).toMatch(/fulfillment_method === "delivery" && shippoConfigured\(\)/);
  });
});
