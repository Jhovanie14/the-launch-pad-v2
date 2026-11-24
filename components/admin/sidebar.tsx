"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";
import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  ADMIN_NAV_FOOTER,
  activeHref,
  adminNav,
  badgeLabel,
  isSuperAdmin,
  type AdminNavItem,
} from "@/lib/navigation/admin";
import { AuthUser } from "@/types";
import LoadingDots from "../loading";

interface AdminSidebarProps {
  user?: AuthUser;
  /** Drawer state lives in AdminShell, so the header opener can drive it. */
  open: boolean;
  onClose: () => void;
}

/**
 * The admin sidebar: grouped links from lib/navigation/admin.ts on the 24/7
 * Bay tokens. The current link is the navbar's white/12 pill, never a side
 * stripe (DESIGN.md).
 */
export function AdminSidebar({ user, open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const handleSignOut = async () => {
    setIsLoggingOut(true); // full-screen loader until the redirect lands
    try {
      await signOut();
    } catch {
      setIsLoggingOut(false);
    }
  };

  // New contact messages, kept live for the Messages badge.
  useEffect(() => {
    const supabase = createClient();

    const fetchContacts = async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (!error && typeof count === "number") {
        setUnreadCount(count);
      }
    };

    fetchContacts();

    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        () => fetchContacts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // The role comes with the profile the admin layout loads, so super-admin
  // links never flash in or out after the page renders.
  const sections = adminNav(user?.user_type);
  const current = activeHref(pathname);
  const counts = { messages: unreadCount };

  const link = (item: AdminNavItem) => (
    <li key={item.href}>
      <NavLink
        item={item}
        current={current === item.href}
        badge={item.badge ? badgeLabel(counts[item.badge]) : null}
        onNavigate={onClose}
      />
    </li>
  );

  return (
    <>
      {isLoggingOut && <LoadingDots />}
      {/* Overlay for small screens */}
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <div
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-night text-on-night-muted transition-transform duration-300 ease-out motion-reduce:transition-none lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
          <Link
            href="/"
            className={cn("flex min-w-0 items-center gap-2.5 rounded-lg", FOCUS_ON_NIGHT)}
          >
            <Image
              src="/thelaunchpad.png"
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
            <span className="flex flex-col leading-tight">
              <span className="text-base font-black tracking-tight text-on-night">
                The Launch Pad
              </span>
              <span className="text-xs text-on-night-subtle">Admin</span>
            </span>
          </Link>

          {/* Sits in the drawer header, in normal flow (see AdminShell). */}
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className={cn(
              "ml-auto grid size-11 shrink-0 place-items-center rounded-lg text-on-night-muted transition-colors hover:bg-white/8 hover:text-on-night motion-reduce:transition-none lg:hidden",
              FOCUS_ON_NIGHT
            )}
          >
            <X aria-hidden className="size-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Admin" className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {sections.map((section) => {
              const items = <ul className="space-y-0.5">{section.items.map(link)}</ul>;
              if (!section.label) return <div key="top">{items}</div>;
              const id = `admin-nav-${section.label.toLowerCase().replace(/\W+/g, "-")}`;
              return (
                <div key={section.label} role="group" aria-labelledby={id} className="mt-5">
                  <h2 id={id} className="mb-1 px-2.5 text-xs font-semibold text-on-night-subtle">
                    {section.label}
                  </h2>
                  {items}
                </div>
              );
            })}
          </div>
          <ul className="shrink-0 border-t border-white/10 px-3 py-2">{link(ADMIN_NAV_FOOTER)}</ul>
        </nav>

        {/* Account */}
        {user && (
          <div className="flex shrink-0 items-center gap-3 border-t border-white/10 p-3">
            <Avatar className="size-9">
              <AvatarImage
                src={user.avatar_url || undefined}
                alt={user.full_name || "Admin"}
              />
              <AvatarFallback className="bg-dusk text-sm font-bold text-flame">
                {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-on-night">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-on-night-subtle">
                {isSuperAdmin(user.user_type) ? "Super admin" : "Admin"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-on-night-muted ring-1 ring-white/25 transition-colors hover:bg-white/10 hover:text-on-night disabled:opacity-60 motion-reduce:transition-none",
                FOCUS_ON_NIGHT
              )}
            >
              <LogOut aria-hidden className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function NavLink({
  item,
  current,
  badge,
  onNavigate,
}: {
  item: AdminNavItem;
  current: boolean;
  badge: string | null;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors motion-reduce:transition-none lg:h-10",
        FOCUS_ON_NIGHT,
        current
          ? "bg-white/12 font-semibold text-on-night"
          : "font-medium text-on-night-muted hover:bg-white/8 hover:text-on-night"
      )}
    >
      <Icon aria-hidden className={cn("size-4.5 shrink-0", current && "text-flame")} />
      <span className="truncate">{item.name}</span>
      {badge && (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-flame px-1.5 text-xs font-bold text-on-flame">
          {badge}
          <span className="sr-only"> unread</span>
        </span>
      )}
    </Link>
  );
}
