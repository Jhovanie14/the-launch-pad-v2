import type { Metadata } from "next";
import {
  BAY_MINIMUM_CARD,
  BAY_MINIMUM_CASH,
  usd,
} from "@/lib/pricing/selfServiceRates";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description and
// self-referencing canonical rather than inheriting the homepage's.
export const metadata: Metadata = {
  title: "Self-Service Car Wash Bays",
  description:
    `DIY wash bays open 24/7 in Houston. From ${usd(BAY_MINIMUM_CASH)} with coins or ${usd(BAY_MINIMUM_CARD)} with tap-to-pay, or unlimited daily access for $19.99 a month.`,
  alternates: { canonical: "/self-service" },
};

export default function SelfServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
