import { describe, expect, it } from "vitest";
import {
  addItem,
  cartTotals,
  itemCount,
  readCart,
  removeItem,
  setQuantity,
  unitPrice,
} from "./cart";

const shampoo = { id: "p1", price: 24.99, sale_price: 14.99 };
const wax = { id: "p2", price: 39.99, sale_price: null };

describe("addItem", () => {
  it("adds a new item with the given quantity", () => {
    expect(addItem([], "p1", 2)).toEqual([{ productId: "p1", quantity: 2 }]);
  });

  it("merges quantity into an existing line", () => {
    const items = addItem([{ productId: "p1", quantity: 1 }], "p1", 2);
    expect(items).toEqual([{ productId: "p1", quantity: 3 }]);
  });

  it("clamps to maxStock when provided", () => {
    const items = addItem([{ productId: "p1", quantity: 4 }], "p1", 3, 5);
    expect(items).toEqual([{ productId: "p1", quantity: 5 }]);
  });

  it("does not mutate the input array", () => {
    const input = [{ productId: "p1", quantity: 1 }];
    addItem(input, "p1", 1);
    expect(input).toEqual([{ productId: "p1", quantity: 1 }]);
  });
});

describe("removeItem / setQuantity", () => {
  it("removes a line", () => {
    expect(removeItem([{ productId: "p1", quantity: 1 }], "p1")).toEqual([]);
  });

  it("setQuantity replaces the quantity", () => {
    expect(setQuantity([{ productId: "p1", quantity: 1 }], "p1", 4)).toEqual([
      { productId: "p1", quantity: 4 },
    ]);
  });

  it("setQuantity to 0 or less removes the line", () => {
    expect(setQuantity([{ productId: "p1", quantity: 2 }], "p1", 0)).toEqual([]);
  });

  it("setQuantity clamps to maxStock", () => {
    expect(setQuantity([{ productId: "p1", quantity: 1 }], "p1", 99, 3)).toEqual(
      [{ productId: "p1", quantity: 3 }],
    );
  });
});

describe("itemCount / readCart", () => {
  it("sums quantities", () => {
    expect(
      itemCount([
        { productId: "p1", quantity: 2 },
        { productId: "p2", quantity: 3 },
      ]),
    ).toBe(5);
  });

  it("readCart parses a valid payload", () => {
    expect(readCart(JSON.stringify([{ productId: "p1", quantity: 2 }]))).toEqual(
      [{ productId: "p1", quantity: 2 }],
    );
  });

  it("readCart returns [] for null, garbage, or malformed entries", () => {
    expect(readCart(null)).toEqual([]);
    expect(readCart("not json {")).toEqual([]);
    expect(readCart(JSON.stringify({ nope: true }))).toEqual([]);
    expect(
      readCart(JSON.stringify([{ productId: "p1", quantity: "two" }])),
    ).toEqual([]);
    expect(readCart(JSON.stringify([{ productId: "p1", quantity: 0 }]))).toEqual(
      [],
    );
  });
});

describe("pricing", () => {
  it("unitPrice prefers sale_price when set", () => {
    expect(unitPrice(shampoo)).toBe(14.99);
    expect(unitPrice(wax)).toBe(39.99);
  });

  it("cartTotals sums lines and adds the fee only for delivery", () => {
    const items = [
      { productId: "p1", quantity: 2 }, // 2 x 14.99 = 29.98
      { productId: "p2", quantity: 1 }, // 39.99
    ];
    const products = [shampoo, wax];

    const pickup = cartTotals(items, products, 7.5, "pickup");
    expect(pickup).toEqual({ subtotal: 69.97, deliveryFee: 0, total: 69.97 });

    const delivery = cartTotals(items, products, 7.5, "delivery");
    expect(delivery).toEqual({ subtotal: 69.97, deliveryFee: 7.5, total: 77.47 });
  });

  it("cartTotals skips items whose product is missing", () => {
    const totals = cartTotals(
      [{ productId: "ghost", quantity: 3 }],
      [shampoo],
      5,
      "pickup",
    );
    expect(totals).toEqual({ subtotal: 0, deliveryFee: 0, total: 0 });
  });

  it("rounds to cents", () => {
    // 3 x 19.99 = 59.97 exactly; float drift must not leak through
    const totals = cartTotals(
      [{ productId: "p3", quantity: 3 }],
      [{ id: "p3", price: 19.99, sale_price: null }],
      0,
      "pickup",
    );
    expect(totals.subtotal).toBe(59.97);
    expect(totals.total).toBe(59.97);
  });
});
