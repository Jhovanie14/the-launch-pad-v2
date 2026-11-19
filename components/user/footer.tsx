import Link from "next/link";
import Image from "next/image";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { copyrightLine, FOOTER_GROUPS, LEGAL_LINKS, SHOP } from "@/lib/marketing/footer";
import { cn } from "@/lib/utils";

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
const LINK = cn(
  "inline-flex min-h-11 items-center gap-2 rounded-md text-sm text-on-night-muted transition-colors hover:text-on-night motion-reduce:transition-none lg:min-h-9",
  FOCUS_ON_NIGHT,
);
const HEADING = "mb-2 text-sm font-bold text-on-night";

const SOCIALS = [
  { name: "Instagram", href: "https://www.instagram.com/thelaunchpadwash/", icon: "/social/instagram.png" },
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61566883617151", icon: "/social/facebook.png" },
  { name: "TikTok", href: "https://www.tiktok.com/@thelaunchpadwash?lang=en", icon: "/social/tiktok.png" },
];

/** The public pages' footer: the navy navbar's sibling, on the tokens. */
export function Footer() {
  return (
    <footer className="bg-night text-on-night">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className={cn("inline-flex items-center gap-3 rounded-lg", FOCUS_ON_NIGHT)}>
            <Image src="/thelaunchpad.png" alt="" width={40} height={40} className="size-10 object-contain" />
            <span className="text-lg font-bold">The Launch Pad</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-on-night-muted">
            Houston&apos;s premier car care destination featuring self-service bays, professional detailing, and our
            famous handwash special.
          </p>
          <ul className="mt-4 flex gap-1">
            {SOCIALS.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`The Launch Pad on ${s.name}`}
                  className={cn("inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/10", FOCUS_ON_NIGHT)}
                >
                  <Image src={s.icon} alt="" width={28} height={28} className="size-7 object-contain" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={HEADING}>Visit</h2>
          <ul>
            <li>
              <a href={SHOP.mapsUrl} target="_blank" rel="noopener noreferrer" className={cn(LINK, "items-start py-2.5")}>
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
                {SHOP.address}
              </a>
            </li>
            {SHOP.hours.map((line) => (
              <li key={line} className="flex items-start gap-2 py-2.5 text-sm text-on-night-muted">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                {line}
              </li>
            ))}
            <li>
              <a href={SHOP.phoneHref} className={LINK}>
                <Phone aria-hidden className="size-4 shrink-0" /> Call {SHOP.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SHOP.email}`} className={LINK}>
                <Mail aria-hidden className="size-4 shrink-0" /> {SHOP.email}
              </a>
            </li>
          </ul>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className={HEADING}>{group.title}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK}>
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p className="text-sm text-on-night-subtle">{copyrightLine(new Date())}</p>
          <ul className="flex flex-wrap gap-x-6">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK}>
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
