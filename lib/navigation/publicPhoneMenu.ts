// The public bar's links, shared by the desktop bar and the phone menu so the
// two never drift apart.

export interface MenuLink {
  name: string;
  href: string;
}

export const PRIMARY_LINKS: MenuLink[] = [
  { name: "Services", href: "/services" },
  { name: "Membership", href: "/pricing" },
  { name: "Self-service", href: "/self-service" },
  { name: "Products", href: "/products" },
];

export const MORE_LINKS: (MenuLink & { description: string })[] = [
  { name: "About us", href: "/about", description: "Who we are and the wash on S Main St" },
  { name: "FAQ", href: "/faq", description: "Answers about bays, booking and memberships" },
  { name: "Blog", href: "/blog", description: "Car care tips and news from The Launch Pad" },
  { name: "Contact", href: "/contact", description: "Call, email or send us a message" },
];

export const ACCOUNT_LINKS: MenuLink[] = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Bookings", href: "/dashboard/bookings" },
  { name: "Billing", href: "/dashboard/billing" },
  { name: "Profile and settings", href: "/dashboard/settings" },
];

export function publicPhoneMenu({ signedIn, cartCount }: { signedIn: boolean; cartCount: number }): {
  primary: MenuLink[];
  more: MenuLink[];
  account: MenuLink[];
} {
  const primary: MenuLink[] = [{ name: "Home", href: "/" }, ...PRIMARY_LINKS];
  if (cartCount > 0) primary.push({ name: `Cart (${cartCount})`, href: "/products/cart" });
  return {
    primary,
    more: MORE_LINKS.map(({ name, href }) => ({ name, href })),
    account: signedIn ? ACCOUNT_LINKS : [],
  };
}
