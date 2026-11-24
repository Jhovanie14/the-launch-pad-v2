// The admin sidebar's links, grouped. One list drives the sidebar, the role
// filter and the super-admin page guard, so the three never drift apart.

import {
  Building2,
  CalendarDays,
  Car,
  CirclePlus,
  CreditCard,
  FileText,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageCircle,
  Notebook,
  Package,
  QrCode,
  Settings,
  ShoppingBasket,
  TicketPercent,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isNavActive } from "./isNavActive";

export type AdminBadge = "messages";

export interface AdminNavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Only super admins see the link, and only they may open the page. */
  requires?: "super_admin";
  badge?: AdminBadge;
}

export interface AdminNavSection {
  /** null: no heading (the Dashboard link at the top). */
  label: string | null;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  { label: null, items: [{ name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] },
  {
    label: "Today",
    items: [
      { name: "Bookings", href: "/admin/booking", icon: CalendarDays },
      { name: "Store orders", href: "/admin/orders", icon: Package },
      { name: "Messages", href: "/admin/contact", icon: MessageCircle, badge: "messages" },
      { name: "Pay & tip QR codes", href: "/admin/qr", icon: QrCode },
    ],
  },
  {
    label: "Customers",
    items: [
      { name: "Customers & staff", href: "/admin/users", icon: Users },
      { name: "Memberships", href: "/admin/subscriptions", icon: CreditCard, requires: "super_admin" },
    ],
  },
  {
    label: "What we sell",
    items: [
      { name: "Services", href: "/admin/services", icon: Car, requires: "super_admin" },
      { name: "Add-ons", href: "/admin/addons", icon: CirclePlus, requires: "super_admin" },
      { name: "Products", href: "/admin/products", icon: ShoppingBasket },
      { name: "Promo codes", href: "/admin/promo", icon: TicketPercent, requires: "super_admin" },
    ],
  },
  {
    label: "Fleet",
    items: [
      { name: "Fleet inquiries", href: "/admin/fleet-inquiry", icon: Building2 },
      { name: "Fleet contracts & invoices", href: "/admin/fleet-payment-management", icon: FileText },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
      { name: "Direct email", href: "/admin/broadcast", icon: Mail },
      { name: "Blog", href: "/admin/blog", icon: Notebook },
    ],
  },
];

/** Pinned to the bottom of the sidebar, above the account row. */
export const ADMIN_NAV_FOOTER: AdminNavItem = { name: "Settings", href: "/admin/settings", icon: Settings };

export function isSuperAdmin(userType: string | null | undefined): boolean {
  return userType === "super_admin";
}

/** The sections this user may see: gated items removed, empty groups dropped. */
export function adminNav(
  userType: string | null | undefined,
  sections: AdminNavSection[] = ADMIN_NAV,
): AdminNavSection[] {
  const superAdmin = isSuperAdmin(userType);
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.requires || superAdmin) }))
    .filter((s) => s.items.length > 0);
}

const ALL_ITEMS: AdminNavItem[] = [...ADMIN_NAV.flatMap((s) => s.items), ADMIN_NAV_FOOTER];

/** The href of the link that owns this page (its section), or null. */
export function activeHref(pathname: string): string | null {
  let best: string | null = null;
  for (const { href } of ALL_ITEMS) {
    if (isNavActive(pathname, href) && (!best || href.length > best.length)) best = href;
  }
  return best;
}

export function isSuperAdminRoute(pathname: string): boolean {
  return ALL_ITEMS.some((i) => i.requires === "super_admin" && isNavActive(pathname, i.href));
}

/** The count shown on a badge: nothing at zero, "9+" past nine. */
export function badgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}
