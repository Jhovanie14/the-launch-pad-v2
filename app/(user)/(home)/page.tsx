import HoursChangeDialog from "@/components/hours-change-dialog";
import { HomeHero } from "@/components/home/HomeHero";
import { WhyLaunchPad } from "@/components/home/WhyLaunchPad";
import { CustomerReviews } from "@/components/home/CustomerReviews";
import { getServicesPageData } from "@/lib/marketing/servicesPageData";

// Prices come from the same data as /services and are read on every request,
// so an admin price change shows at once. Metadata lives in ./layout.tsx.
export const dynamic = "force-dynamic";

export default async function Home() {
  const model = await getServicesPageData();
  return (
    <main className="lp-theme flex-1">
      {/* The hours notice: informational, so it shows to every visitor. */}
      <HoursChangeDialog surface="landing" />
      <HomeHero model={model} />
      <WhyLaunchPad />
      <CustomerReviews />
    </main>
  );
}
