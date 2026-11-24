import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ADMIN_NAV } from "@/lib/navigation/admin";

// Source-level guard: the pages hidden from regular admins in the sidebar must
// also refuse them on the server, and the two lists must stay identical.
const root = process.cwd();

describe("super-admin page guard", () => {
  it("guarded folders are exactly the super-admin nav items", () => {
    const gated = ADMIN_NAV.flatMap((s) => s.items)
      .filter((i) => i.requires === "super_admin")
      .map((i) => i.href);
    expect(new Set(gated)).toEqual(
      new Set(["/admin/subscriptions", "/admin/services", "/admin/addons", "/admin/promo"]),
    );

    for (const href of gated) {
      const layout = join(root, "app", href, "layout.tsx");
      expect(existsSync(layout), `${href}/layout.tsx`).toBe(true);
      expect(readFileSync(layout, "utf8")).toContain("requireSuperAdminPage()");
    }

    const guarded = readdirSync(join(root, "app/admin"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .filter((d) => {
        const layout = join(root, "app/admin", d.name, "layout.tsx");
        return existsSync(layout) && readFileSync(layout, "utf8").includes("requireSuperAdminPage");
      })
      .map((d) => `/admin/${d.name}`);
    expect(new Set(guarded)).toEqual(new Set(gated));
  });

  it("the helper redirects anyone who is not a super admin", () => {
    const src = readFileSync(join(root, "lib/auth/superAdminPage.ts"), "utf8");
    expect(src).toContain('redirect("/admin/dashboard")');
    expect(src).toContain("isSuperAdmin(");
  });
});
