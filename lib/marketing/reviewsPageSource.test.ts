import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for /reviews (Vitest has no DOM here).
const PAGE = join(process.cwd(), "app/(user)/reviews/page.tsx");
const LAYOUT = join(process.cwd(), "app/(user)/reviews/layout.tsx");
const read = (f: string) => readFileSync(f, "utf8");

describe("reviews page source", () => {
  it("no rating claims in the page or its metadata", () => {
    const banned = ["4.9", "500+", "4.4", "best price", "guarantee", "more than 500"];
    const hits = [PAGE, LAYOUT].flatMap((f) =>
      banned.filter((b) => read(f).toLowerCase().includes(b)).map((b) => `${f}: ${b}`),
    );
    expect(hits).toEqual([]);
  });

  it("no raw palette classes", () => {
    expect(read(PAGE).match(/[\w:-]*-(slate|blue|amber|violet|emerald|gray|yellow)-\d+/g) ?? []).toEqual([]);
  });

  // DESIGN.md: flame shows on white only as its darker mark shade (3:1).
  it("stars on the white cards use the flame mark shade", () => {
    expect(read(PAGE)).not.toMatch(/text-flame/);
    expect(read(PAGE)).toContain("text-svc-detail-mark");
  });

  it("the page is a server component built from the real reviews", () => {
    expect(read(PAGE)).not.toMatch(/^\s*["']use client["']/);
    expect(read(PAGE)).toContain("GOOGLE_REVIEWS");
  });
});
