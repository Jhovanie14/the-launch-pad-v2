import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Source-level guards for the admin sidebar (Vitest has no DOM here).
const src = () => readFileSync(join(process.cwd(), "components/admin/sidebar.tsx"), "utf8");

describe("admin sidebar source", () => {
  it("renders the shared config", () => {
    const s = src();
    expect(s).toContain("adminNav(");
    expect(s).toContain("activeHref(");
    expect(s).toContain("badgeLabel(");
    expect(s).not.toContain("const navigation = [");
  });

  it("marks the current page", () => {
    expect(src()).toContain("aria-current");
  });

  it("groups are labelled", () => {
    const s = src();
    expect(s).toContain('role="group"');
    expect(s).toContain("aria-labelledby");
    expect(s).toContain('aria-label="Admin"');
  });

  it("tokens only", () => {
    const s = src();
    expect(s.match(/(blue|gray|red|slate)-\d/g) ?? []).toEqual([]);
    expect(s).not.toContain("text-[10px]");
  });

  it("no fake sign-out wait and no browser role fetch", () => {
    const s = src();
    expect(s).not.toContain("setTimeout");
    expect(s).not.toContain('.select("user_type")');
  });

  it("sign-out is a labelled button", () => {
    const s = src();
    expect(s).toContain('type="button"');
    expect(s).toContain("Sign out");
  });

  it("sign-out is a 44px target on phones (DESIGN.md)", () => {
    const button = src().match(/onClick=\{handleSignOut\}[\s\S]*?className=\{cn\(\s*"([^"]+)"/);
    expect(button?.[1]).toMatch(/\bh-11\b/);
    expect(button?.[1]).toMatch(/\blg:h-10\b/);
  });
});
