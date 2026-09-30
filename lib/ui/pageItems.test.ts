import { describe, expect, it } from "vitest";
import { getPageItems } from "./pageItems";

describe("getPageItems", () => {
  it("lists every page when there are 7 or fewer", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("shows the start of the range near the first page", () => {
    expect(getPageItems(1, 40)).toEqual([1, 2, 3, 4, 5, "gap", 40]);
    expect(getPageItems(4, 40)).toEqual([1, 2, 3, 4, 5, "gap", 40]);
  });

  it("shows the end of the range near the last page", () => {
    expect(getPageItems(40, 40)).toEqual([1, "gap", 36, 37, 38, 39, 40]);
    expect(getPageItems(37, 40)).toEqual([1, "gap", 36, 37, 38, 39, 40]);
  });

  it("centres on the current page in the middle", () => {
    expect(getPageItems(20, 40)).toEqual([1, "gap", 19, 20, 21, "gap", 40]);
  });

  it("never returns more than 7 items", () => {
    for (let p = 1; p <= 100; p++) {
      expect(getPageItems(p, 100).length).toBeLessThanOrEqual(7);
    }
  });
});
