import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level checks of the order-flow migration (it is applied by the user,
// never by these tests).
const sql = () =>
  readFileSync(join(process.cwd(), "supabase/migrations/20261124000000_product_order_flow.sql"), "utf8").toLowerCase();

describe("product order flow migration", () => {
  it("adds the payment and fulfilment columns", () => {
    const s = sql();
    for (const col of [
      "payment_method",
      "payment_status",
      "fulfilment_status",
      "paid_via",
      "paid_at",
      "ready_at",
      "hold_until",
      "reminder_sent_at",
      "completed_at",
      "completed_by",
      "released_at",
      "stock_taken",
      "stock_released_at",
    ]) {
      expect(s, col).toMatch(new RegExp(`add column if not exists ${col}\\b`));
    }
    expect(s).toContain("ref text generated always as (upper(left(id::text, 8))) stored");
  });

  it("store settings gain pickup hours and hold days", () => {
    const s = sql();
    expect(s).toMatch(/add column if not exists pickup_hours text/);
    expect(s).toMatch(/add column if not exists hold_days integer not null default 3/);
    expect(s).toContain("between 1 and 14");
  });

  it("backfill maps every legacy status", () => {
    const backfill = sql().split("-- backfill")[1] ?? "";
    for (const st of ["pending", "paid", "ready_for_pickup", "out_for_delivery", "completed", "cancelled", "refunded"]) {
      expect(backfill, st).toContain(`'${st}'`);
    }
  });

  it("functions are service-role only", () => {
    const s = sql();
    for (const fn of ["place_product_order", "take_product_order_stock", "release_product_order_stock"]) {
      expect(s, fn).toMatch(new RegExp(`function public\\.${fn}\\([^)]*\\)[\\s\\S]*?security definer`));
      expect(s, fn).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`));
      expect(s, fn).toMatch(new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));
    }
  });

  it("stock is taken atomically", () => {
    const body = sql().split("function public.place_product_order")[1] ?? "";
    expect(body).toContain("stock >= ");
    expect(body).toContain("raise exception 'insufficient_stock:%'");
  });

  it("legacy status trigger exists", () => {
    const s = sql();
    expect(s).toContain("product_orders_sync_legacy_status");
    expect(s).toContain("before update of status");
  });

  it("product orders join realtime", () => {
    expect(sql()).toMatch(/alter publication supabase_realtime add table public\.product_orders/);
  });
});
