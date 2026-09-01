import type { Metadata } from "next";
import { openGraph, twitter } from "@/lib/seo/openGraph";
import {
  BAY_MINIMUM_CARD,
  BAY_MINIMUM_CASH,
  usd,
} from "@/lib/pricing/selfServiceRates";

// This page is a client component, which cannot export metadata. The layout
// carries it instead, so the route gets its own title, description, canonical
// and social card rather than inheriting the homepage's.
const TITLE = "Self-Service Car Wash Bays";
const DESCRIPTION =
  `DIY wash bays open 24/7 in Houston. From ${usd(BAY_MINIMUM_CASH)} with coins or ${usd(BAY_MINIMUM_CARD)} with tap-to-pay, or unlimited daily access for $19.99 a month.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/self-service" },
  openGraph: openGraph({ title: TITLE, description: DESCRIPTION, path: "/self-service" }),
  twitter: twitter({ title: TITLE, description: DESCRIPTION }),
};

export default function SelfServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
