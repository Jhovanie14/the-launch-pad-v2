import Link from "next/link";
import { Droplets, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BAY_MINIMUM_CARD, BAY_MINIMUM_CASH, usd } from "@/lib/pricing/selfServiceRates";
import type { ServicesPageModel } from "@/lib/marketing/servicesPage";
import { FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";

const money = (n: number) => `$${n.toFixed(2)}`;

const TILE_LINK = cn(
  "mt-4 inline-flex h-11 items-center rounded-lg px-3 text-sm font-semibold text-on-night ring-1 ring-paper/20 transition-colors hover:bg-paper/10 motion-reduce:transition-none",
  FOCUS_ON_NIGHT
);

function Tile({
  icon: Icon,
  tint,
  name,
  body,
  price,
  link,
}: {
  icon: typeof Droplets;
  tint: string;
  name: string;
  body: string;
  price: React.ReactNode | null;
  link: { href: string; label: string };
}) {
  return (
    <li className="flex flex-col rounded-2xl bg-dusk p-5 ring-1 ring-paper/10">
      <h2 className={cn("flex items-center gap-2 text-base font-bold", tint)}>
        <Icon className="size-5" aria-hidden />
        {name}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-on-night-muted">{body}</p>
      {price && <p className="mt-4 text-2xl font-black tracking-[-0.025em]">{price}</p>}
      <Link href={link.href} className={cn(TILE_LINK, "self-start")}>
        {link.label}
      </Link>
    </li>
  );
}

/**
 * The three service lines on navy, with prices from real data. Shared by
 * /services and the home page so their prices can never differ.
 */
export function ServiceTileGrid({
  model,
  menuHref,
  className,
}: {
  model: ServicesPageModel;
  /** Where "See the menu" goes: "#menu" on /services, "/services#menu" elsewhere. */
  menuHref: string;
  className?: string;
}) {
  return (
      <ul className={cn("grid gap-4 md:grid-cols-3", className)}>
        <Tile
          icon={Droplets}
          tint="text-svc-self"
          name="Self-service bays"
          body="Open 24/7. High-pressure wash, foam brush, spot-free rinse, vacuums."
          price={
            <>
              {usd(BAY_MINIMUM_CASH)}{" "}
              <span className="text-sm font-semibold text-on-night-muted">coins · {usd(BAY_MINIMUM_CARD)} tap-to-pay</span>
            </>
          }
          link={{ href: "/self-service", label: "How the bays work" }}
        />
        <Tile
          icon={Sparkles}
          tint="text-flame"
          name="Express detailing"
          body="Thu–Sun by appointment. Quick service and express detail packages."
          price={model.detailingFrom !== null ? `From ${money(model.detailingFrom)}` : null}
          link={{ href: menuHref, label: "See the menu" }}
        />
        <Tile
          icon={Star}
          tint="text-svc-member"
          name="Membership"
          body="Unlimited washes, monthly or yearly, no contract."
          price={
            model.membershipFrom ? (
              <>
                From {money(model.membershipFrom.price)}{" "}
                <span className="text-sm font-semibold text-on-night-muted">
                  a month · {model.membershipFrom.planName} plan
                </span>
              </>
            ) : null
          }
          link={{ href: "/pricing", label: "See plans" }}
        />
      </ul>
  );
}
