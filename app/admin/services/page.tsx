import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import ServicesView from "./services-view";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Car Wash Services & Pricing",
  description:
    "Self-service car wash bays $8 per visit, express detailing from $25, and unlimited monthly memberships: Basic $39.99/mo and Deluxe $59.99/mo. One price for all vehicles — no vehicle upcharges.",
  alternates: {
    canonical: "/services",
  },
  openGraph: {
    title: "Car Wash Services & Pricing | The Launch Pad Houston",
    description:
      "Self-service bays, express detailing, and memberships. Pricing for all vehicle types. Book online at 10410 S Main St, Houston.",
    url: "https://www.thelaunchpadwash.com/services",
  },
};

export default async function ServicesPage() {
  const profile = await getUserProfile();

  return (
    <div className="flex-1 flex flex-col overflow-hidden mx-auto  mt-16 lg:mt-0 p-6 md:px-6">
      <ServicesView />
    </div>
  );
}
