import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level checks of the Zelle + pickup note migration (applied by the
// user, never by these tests).
const sql = () =>
  readFileSync(join(process.cwd(), "supabase/migrations/20261125000000_zelle_pickup_note.sql"), "utf8").toLowerCase();

describe("zelle and pickup note migration", () => {
  it("widens paid_via to include zelle", () => {
    const s = sql();
    expect(s).toContain("drop constraint if exists product_orders_paid_via_check");
    expect(s).toMatch(/paid_via in \('stripe',\s*'cash',\s*'card_reader',\s*'counter_qr',\s*'zelle'\)/);
  });

  it("adds an optional pickup note of at most 200 characters", () => {
    const s = sql();
    expect(s).toContain("add column if not exists pickup_note text");
    expect(s).toContain("char_length(pickup_note) <= 200");
  });

  it("reloads the API schema", () => {
    expect(sql()).toContain("notify pgrst, 'reload schema'");
  });
});
