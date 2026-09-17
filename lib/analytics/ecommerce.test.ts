import { describe, expect, it } from "vitest";
import {
  cartAnalyticsItems,
  ecommercePayload,
  itemsValue,
  toAnalyticsItem,
} from "./ecommerce";

const wax = {
  id: "p1",
  name: "Carnauba Wax",
  category: "Exterior",
  price: 39.99,
  sale_price: null,
};
const tire = {
  id: "p2",
  name: "Tire Shine",
  category: "Exterior",
  price: 20,
  sale_price: 12.5,
};

describe("toAnalyticsItem", () => {
  it("maps a product to the GA4 item shape", () => {
    expect(toAnalyticsItem(wax)).toEqual({
      item_id: "p1",
      item_name: "Carnauba Wax",
      item_category: "Exterior",
      price: 39.99,
      quantity: 1,
    });
  });

  it("reports the sale price, not the list price", () => {
    // Otherwise GA4 revenue disagrees with what Stripe actually charged.
    expect(toAnalyticsItem(tire).price).toBe(12.5);
  });

  it("carries the quantity through", () => {
    expect(toAnalyticsItem(wax, 3).quantity).toBe(3);
  });
});

describe("itemsValue", () => {
  it("sums price by quantity", () => {
    const items = [toAnalyticsItem(wax, 2), toAnalyticsItem(tire, 1)];
    expect(itemsValue(items)).toBe(92.48);
  });

  it("rounds to two decimals rather than leaking float noise", () => {
    const items = [toAnalyticsItem({ ...wax, price: 0.1 }, 3)];
    expect(itemsValue(items)).toBe(0.3);
  });

  it("is zero for an empty cart", () => {
    expect(itemsValue([])).toBe(0);
  });
});

describe("ecommercePayload", () => {
  it("builds currency, value and items", () => {
    expect(ecommercePayload([toAnalyticsItem(wax)])).toEqual({
      currency: "USD",
      value: 39.99,
      items: [
        {
          item_id: "p1",
          item_name: "Carnauba Wax",
          item_category: "Exterior",
          price: 39.99,
          quantity: 1,
        },
      ],
    });
  });

  it("merges extra params such as transaction_id", () => {
    const payload = ecommercePayload([toAnalyticsItem(wax)], {
      transaction_id: "order-9",
    });
    expect(payload.transaction_id).toBe("order-9");
    expect(payload.value).toBe(39.99);
  });
});

describe("cartAnalyticsItems", () => {
  const products = [wax, tire];

  it("joins cart lines to products, keeping quantities", () => {
    const items = cartAnalyticsItems(
      [
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 1 },
      ],
      products,
    );
    expect(items).toEqual([
      { item_id: "p1", item_name: "Carnauba Wax", item_category: "Exterior", price: 39.99, quantity: 2 },
      { item_id: "p2", item_name: "Tire Shine", item_category: "Exterior", price: 12.5, quantity: 1 },
    ]);
  });

  it("drops cart lines whose product is gone rather than sending blanks", () => {
    const items = cartAnalyticsItems(
      [
        { productId: "p1", quantity: 1 },
        { productId: "deleted", quantity: 4 },
      ],
      products,
    );
    expect(items.map((i) => i.item_id)).toEqual(["p1"]);
  });

  it("is empty for an empty cart", () => {
    expect(cartAnalyticsItems([], products)).toEqual([]);
  });
});
