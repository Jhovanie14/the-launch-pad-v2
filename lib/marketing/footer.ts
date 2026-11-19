// The public footer's content in one place: link groups, shop facts and the
// copyright line.

export interface FooterLink {
  name: string;
  href: string;
}

export const FOOTER_GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Services",
    links: [
      { name: "Self-service", href: "/self-service" },
      { name: "Detailing", href: "/services" },
      { name: "Membership", href: "/pricing" },
      { name: "Products", href: "/products" },
    ],
  },
  {
    title: "The Launch Pad",
    links: [
      { name: "About us", href: "/about" },
      { name: "How it works", href: "/how-it-works" },
      { name: "Reviews", href: "/reviews" },
      { name: "Blog", href: "/blog" },
      { name: "FAQ", href: "/faq" },
      { name: "Contact", href: "/contact" },
    ],
  },
];

const ADDRESS = "10410 S Main St, Houston, TX 77025";

export const SHOP = {
  address: ADDRESS,
  mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS)}`,
  phoneDisplay: "(832) 219-8320",
  phoneHref: "tel:+18322198320",
  email: "info@thelaunchpadwash.com",
  hours: ["Self-service bays: open 24/7", "Detailing: Thu–Sun, 9:30 AM–6:30 PM"],
};

export const LEGAL_LINKS: FooterLink[] = [
  { name: "Terms of Service", href: "/terms" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Cookie Policy", href: "/cookies" },
];

/** The copyright line for the shop's own year (Houston time). */
export function copyrightLine(now: Date): string {
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "America/Chicago" }).format(now);
  return `© ${year} The Launch Pad. All rights reserved.`;
}
