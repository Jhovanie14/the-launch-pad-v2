import { describe, expect, it } from "vitest";
import { orderItemsRowsHtml } from "./product-order-emails";

describe("orderItemsRowsHtml", () => {
  it("renders one row per item with quantity and line total", () => {
    const html = orderItemsRowsHtml([
      { name: "Tire Shine Pro", quantity: 2, unit_price: 19.99 },
      { name: "Ceramic Wax", quantity: 1, unit_price: 39.99 },
    ]);
    expect(html).toContain("Tire Shine Pro");
    expect(html).toContain("&times;2"); // quantity marker (HTML entity for email clients)
    expect(html).toContain("$39.98"); // 2 x 19.99
    expect(html).toContain("$39.99");
  });

  it("escapes HTML in product names", () => {
    const html = orderItemsRowsHtml([
      { name: `<img src=x onerror=alert(1)>`, quantity: 1, unit_price: 5 },
    ]);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
