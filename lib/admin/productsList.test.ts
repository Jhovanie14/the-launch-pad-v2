import { describe, expect, it } from "vitest";
import {
  chipCounts,
  matchesChip,
  matchesProductSearch,
  needsList,
  parseStockInput,
  receivePatch,
} from "./productsList";
import type { ProductRow } from "@/types/db";

const p = (over: Partial<ProductRow> = {}): ProductRow =>
  ({
    id: "p",
    name: "Wheel brush",
    display_name: null,
    category: "Exterior care",
    description: "Soft bristles.",
    image_url: "a.png",
    video_url: "v.mp4",
    stock: 20,
    is_active: true,
    ...over,
  }) as unknown as ProductRow;

describe("needsList", () => {
  it("lists what a listing is missing", () => {
    expect(needsList(p())).toEqual([]);
    expect(needsList(p({ image_url: null, video_url: "", description: "  " }))).toEqual(["photo", "video", "description"]);
  });
  it("asks for a short name only when the full name is long and none is set", () => {
    const long = "x".repeat(49);
    expect(needsList(p({ name: long }))).toEqual(["short name"]);
    expect(needsList(p({ name: long, display_name: "Short" }))).toEqual([]);
    expect(needsList(p({ name: "x".repeat(48) }))).toEqual([]);
  });
});

describe("chips", () => {
  const list = [
    p({ id: "a", stock: 0 }),
    p({ id: "b", stock: 3 }),
    p({ id: "c", stock: 5 }),
    p({ id: "d", stock: 6, video_url: null }),
    p({ id: "e", is_active: false }),
  ];
  it("low is 1 to 5, out is 0", () => {
    expect(list.filter((x) => matchesChip(x, "low")).map((x) => x.id)).toEqual(["b", "c"]);
    expect(list.filter((x) => matchesChip(x, "out")).map((x) => x.id)).toEqual(["a"]);
  });
  it("needs content follows the photo, video and description rule", () => {
    expect(list.filter((x) => matchesChip(x, "needs")).map((x) => x.id)).toEqual(["d"]);
  });
  it("hidden is not shown in the shop", () => {
    expect(list.filter((x) => matchesChip(x, "hidden")).map((x) => x.id)).toEqual(["e"]);
  });
  it("counts each chip", () => {
    expect(chipCounts(list)).toEqual({ all: 5, low: 2, out: 1, needs: 1, hidden: 1 });
  });
});

describe("matchesProductSearch", () => {
  it("matches name, short name and category, any case", () => {
    const x = p({ name: "The Launch Pad Utility Towels", display_name: "Utility towels, 8-pack" });
    expect(matchesProductSearch(x, "UTILITY")).toBe(true);
    expect(matchesProductSearch(x, "8-pack")).toBe(true);
    expect(matchesProductSearch(x, "exterior")).toBe(true);
    expect(matchesProductSearch(x, "wax")).toBe(false);
    expect(matchesProductSearch(x, "  ")).toBe(true);
  });
});

describe("stock input", () => {
  it("adds a whole number from 1 to 100000", () => {
    for (const bad of ["", "0", "-1", "2.5", "100001", "abc"]) {
      expect(parseStockInput(bad, "add").ok, bad).toBe(false);
    }
    expect(parseStockInput(" 12 ", "add")).toEqual({ ok: true, value: 12 });
  });
  it("an exact count may be 0", () => {
    expect(parseStockInput("0", "set")).toEqual({ ok: true, value: 0 });
    expect(parseStockInput("-3", "set").ok).toBe(false);
  });
  it("adds or sets", () => {
    expect(receivePatch(3, 12, "add")).toBe(15);
    expect(receivePatch(3, 12, "set")).toBe(12);
  });
});
