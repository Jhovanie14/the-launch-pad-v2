import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the home page (Vitest has no DOM here).
const root = process.cwd();
const PAGE = join(root, "app/(user)/(home)/page.tsx");
const HOME_DIR = join(root, "components/home");

// Every file that holds home page copy, including the copy module and the
// shared service tiles shown in the hero.
const COPY_FILES = [join(root, "lib/marketing/homePage.ts"), join(root, "components/services/ServiceTileGrid.tsx")];

function homeSources(): { file: string; text: string }[] {
  const files = [PAGE, ...COPY_FILES];
  if (existsSync(HOME_DIR)) {
    for (const f of readdirSync(HOME_DIR)) if (f.endsWith(".tsx")) files.push(join(HOME_DIR, f));
  }
  return files.map((file) => ({ file, text: readFileSync(file, "utf8") }));
}

describe("home page source", () => {
  it("no unverified claims", () => {
    const banned = ["4.9", "500+", "4.4", "best price", "guarantee"];
    const hits = homeSources().flatMap(({ file, text }) =>
      banned.filter((b) => text.toLowerCase().includes(b)).map((b) => `${file}: ${b}`),
    );
    expect(hits).toEqual([]);
  });

  it("no raw palette classes", () => {
    const hits = homeSources().flatMap(({ file, text }) =>
      (text.match(/[\w:-]*-(slate|blue|amber|violet|emerald|gray)-\d+/g) ?? []).map((m) => `${file}: ${m}`),
    );
    expect(hits).toEqual([]);
  });

  it("services section sits between the hero and why", () => {
    const page = readFileSync(PAGE, "utf8");
    const hero = page.indexOf("<HomeHero");
    const services = page.indexOf("<HomeServices");
    const why = page.indexOf("<WhyLaunchPad");
    expect(hero).toBeGreaterThan(-1);
    expect(services).toBeGreaterThan(hero);
    expect(why).toBeGreaterThan(services);
  });

  it("the page is a server component", () => {
    expect(readFileSync(PAGE, "utf8")).not.toMatch(/^\s*["']use client["']/);
    expect(existsSync(HOME_DIR)).toBe(true);
  });
});

describe("home claims guard", () => {
  it("covers the copy module and the shared tiles", () => {
    const scanned = homeSources().map((s) => s.file);
    for (const f of COPY_FILES) expect(scanned).toContain(f);
  });
});
