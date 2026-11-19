import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Reduced motion: a `motion-reduce:animate-none` override loses to the
// data-state animation selectors (higher specificity), so every entrance and
// exit animation on the booking sheet must be opted in with `motion-safe:`.
describe("booking sheet respects reduced motion", () => {
  it("every data-state animation class is behind motion-safe:", () => {
    const source = readFileSync(join(process.cwd(), "components/booking/ui/BookingSheet.tsx"), "utf8");
    const classes = source.match(/[\w:-]*data-\[state=(?:open|closed)\]:[\w-]+/g) ?? [];
    expect(classes.length).toBeGreaterThan(0);
    const unguarded = classes.filter((c) => !c.split(":").includes("motion-safe"));
    expect(unguarded).toEqual([]);
  });
});
