import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NIGHT_SHEET_CONTENT } from "@/components/user/SheetLink";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

// Source-level checks for the navy phone menus: Vitest has no DOM here.
describe("navy phone menu sheets", () => {
  it("the public menu button is the sheet's trigger, so closing returns focus to it", () => {
    expect(read("components/user/navbar.tsx")).toMatch(/<SheetTrigger asChild>/);
  });

  it("the close button is a 44px target with the Flame focus outline", () => {
    for (const cls of ["[&>button]:size-11", "[&>button]:focus-visible:outline-flame", "[&>button]:focus:ring-0"]) {
      expect(NIGHT_SHEET_CONTENT.split(" ")).toContain(cls);
    }
  });

  it("both navy menus use the shared sheet classes", () => {
    for (const file of ["components/user/navbar.tsx", "components/user/authNavbar.tsx"]) {
      expect(read(file)).toContain("className={NIGHT_SHEET_CONTENT}");
    }
  });
});
