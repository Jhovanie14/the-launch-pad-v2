import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the home page (Vitest has no DOM here).
const root = process.cwd();
const PAGE = join(root, "app/(user)/(home)/page.tsx");
const HOME_DIR = join(root, "components/home");

function homeSources(): { file: string; text: string }[] {
  const files = [PAGE];
  if (existsSync(HOME_DIR)) {
    for (const f of readdirSync(HOME_DIR)) if (f.endsWith(".tsx")) files.push(join(HOME_DIR, f));
  }
  return files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
}

describe("home page source", () => {
  it("no unverified claims", () => {
    const banned = ["4.9", "500+", "4.4", "Best price", "guarantee"];
    const hits = homeSources().flatMap(({ file, text }) =>
      banned.filter((b) => text.includes(b)).map((b) => `${file}: ${b}`),
    );
    expect(hits).toEqual([]);
  });

  it("no raw palette classes", () => {
    const hits = homeSources().flatMap(({ file, text }) =>
      (text.match(/[\w:-]*-(slate|blue|amber|violet|emerald|gray)-\d+/g) ?? []).map((m) => `${file}: ${m}`),
    );
    expect(hits).toEqual([]);
  });

  it("the page is a server component", () => {
    expect(readFileSync(PAGE, "utf8")).not.toMatch(/^\s*["']use client["']/);
    expect(existsSync(HOME_DIR)).toBe(true);
  });
});
