import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// product_orders.status is deprecated (payment_status + fulfilment_status
// replace it). New orders keep status='pending' forever, so any screen still
// reading it would hide or mislabel them.
const root = process.cwd();
const BANNED = ["ready_for_pickup", "orderStatusLabel", "nextActionFor", "products/orderStatus"];

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f)) out.push(p);
  }
  return out;
}

describe("order status readers", () => {
  it("nothing reads product_orders.status", () => {
    const hits = ["app", "lib", "hooks", "components"]
      .flatMap((d) => sources(join(root, d)))
      .map((p) => relative(root, p).replace(/\\/g, "/"))
      .flatMap((p) => {
        const text = readFileSync(join(root, p), "utf8");
        return BANNED.filter((b) => text.includes(b)).map((b) => `${p}: ${b}`);
      });
    expect(hits).toEqual([]);
  });
});
