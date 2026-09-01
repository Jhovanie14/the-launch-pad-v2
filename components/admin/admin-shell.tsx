"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { AdminSidebar } from "./sidebar";
import { Button } from "@/components/ui/button";
import { AuthUser } from "@/types";

/**
 * Admin chrome: the sidebar plus the small-screen header that opens it.
 *
 * The drawer state lives here rather than inside the sidebar because the
 * opener now sits in a header that is a sibling of the sidebar, not a child.
 *
 * That header is the point. The opener used to be a `fixed` button pinned to
 * the top-right corner, so it floated over whatever each page happened to put
 * there. Eight pages had grown a `mt-16 lg:mt-0` to duck under it; the other
 * nine, `/admin/dashboard` included, simply overlapped. A header in normal
 * flow pushes content down instead, which fixes every page at once and needs
 * no per-page margin.
 *
 * The breakpoint is `lg` (1024px), so this applies to iPad portrait as well as
 * phones - only landscape tablets and desktops get the static sidebar.
 */
export function AdminShell({
  user,
  children,
}: {
  user?: AuthUser;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* min-w-0 so wide admin tables scroll inside the column instead of
          stretching it and pushing the sidebar off-screen. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-sidebar-border bg-background px-4 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold tracking-tight">The Launch Pad</span>
        </header>

        {children}
      </div>
    </div>
  );
}
