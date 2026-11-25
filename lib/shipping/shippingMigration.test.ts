import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level checks of the shipping migration (applied by the user, never by
// these tests).
const sql = () =>
  readFileSync(join(process.cwd(), "supabase/migrations/20261125010000_shipping.sql"), "utf8").toLowerCase();

describe("shipping migration", () => {
  it("adds product weights and the shipping settings", () => {
    const s = sql();
    expect(s).toMatch(/add column if not exists weight_oz numeric/);
    expect(s).toContain("weight_oz > 0");
    expect(s).toMatch(/add column if not exists shipping_pouches jsonb/);
    expect(s).toMatch(/add column if not exists shipping_excluded_states text\[\] not null default '\{\}'/);
  });

  it("adds the order shipping fields", () => {
    const s = sql();
    for (const col of [
      "shipping_service",
      "shipping_rate_id",
      "shippo_order_id",
      "tracking_number",
      "tracking_url",
      "carrier",
      "label_url",
      "shipped_at",
      "delivered_at",
      "shipping_problem",
      "shippo_push_error",
    ]) {
      expect(s, col).toMatch(new RegExp(`add column if not exists ${col}\\b`));
    }
    expect(s).toMatch(/shippo_order_id text unique/);
  });

  it("adds a place_product_order overload for shipping orders, service role only", () => {
    const s = sql();
    expect(s).toContain("create or replace function public.place_product_order(");
    expect(s).toContain("p_fulfillment_method text");
    expect(s).toContain("'delivery_needs_card'");
    expect(s).toContain("'invalid_fulfillment'");
    expect(s).toContain(
      "revoke all on function public.place_product_order(uuid, text, jsonb, numeric, numeric, text, text, numeric, jsonb, text, text) from public, anon, authenticated",
    );
  });

  it("reloads the API schema", () => {
    expect(sql()).toContain("notify pgrst, 'reload schema'");
  });
});
