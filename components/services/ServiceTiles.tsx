import Link from "next/link";
import { Droplets, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BAY_MINIMUM_CARD, BAY_MINIMUM_CASH, usd } from "@/lib/pricing/selfServiceRates";
import type { ServicesPageModel } from "@/lib/marketing/servicesPage";
import { FLAME_BUTTON, FOCUS_ON_NIGHT } from "@/components/booking/ui/focus";

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

/** The navy top of /services: the three service lines, with prices from real data. */
export default function ServiceTiles({ model }: { model: ServicesPageModel }) {
  return (
    <section aria-labelledby="services-title" className="bg-night text-on-night">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 id="services-title" className="text-5xl font-black leading-[0.95] tracking-[-0.035em] text-balance sm:text-6xl">
          Our services
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-on-night-muted">
          Self-service bays, express detailing and memberships, all at 10410 S Main St, Houston.
        </p>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
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
            link={{ href: "#menu", label: "See the menu" }}
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

        <Link href="/service" className={cn(FLAME_BUTTON, "mt-8")}>
          Book a detail
        </Link>
      </div>
    </section>
  );
}
