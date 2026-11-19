import ServiceTiles from "@/components/services/ServiceTiles";
import ServiceMenu from "@/components/services/ServiceMenu";
import { getServicesPageData } from "@/lib/marketing/servicesPageData";

// Prices are read on every request, so an admin price change shows at once.
// Metadata lives in ./layout.tsx.
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const model = await getServicesPageData();
  return (
    <div className="lp-theme bg-canvas text-ink">
      <ServiceTiles model={model} />
      <ServiceMenu model={model} />
    </div>
  );
}
