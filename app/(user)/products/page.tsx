import { splitCatalog } from "@/lib/products/catalog";
import { getActiveProducts, getStoreSettings } from "@/lib/products/queries";
import { StorefrontHero } from "@/components/products/storefront-hero";
import { ProductCatalog } from "@/components/products/product-catalog";
import { DEFAULT_HOLD_DAYS } from "@/lib/products/storeSettings";
import { SURFACE } from "@/components/booking/ui/focus";
import { cn } from "@/lib/utils";

// Rendered on the server so the catalog is in the HTML crawlers receive.
// The old page fetched in the browser, which left search engines a spinner.
export const revalidate = 300;

const CATALOG_ANCHOR = "range";

const FALLBACK_HERO = {
  headline: "Pro Series Car Care",
  subcopy:
    "Professional-grade detailing products, made for the finish we put on cars every day. Order online and collect at our S Main St store.",
  ctaLabel: "Explore the range",
};

export default async function ProductsPage() {
  const [products, settings] = await Promise.all([
    getActiveProducts(),
    getStoreSettings(),
  ]);

  const { featured, rest } = splitCatalog(products);

  // With nothing curated yet, everything goes to the grid rather than leaving
  // the page with an empty featured tier.
  const gridProducts = featured.length > 0 ? rest : products;

  return (
    <main className="lp-theme flex-1 bg-canvas text-ink">
      <StorefrontHero
        videoUrl={settings?.hero_video_url ?? null}
        posterUrl={settings?.hero_poster_url ?? null}
        headline={settings?.hero_headline || FALLBACK_HERO.headline}
        subcopy={settings?.hero_subcopy || FALLBACK_HERO.subcopy}
        ctaLabel={settings?.hero_cta_label || FALLBACK_HERO.ctaLabel}
        holdDays={settings?.hold_days ?? DEFAULT_HOLD_DAYS}
        targetId={CATALOG_ANCHOR}
      />

      {products.length === 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <p className={cn(SURFACE, "p-6 text-ink-muted")}>No products right now. Check back soon.</p>
        </section>
      ) : (
        <ProductCatalog
          products={gridProducts}
          featured={featured}
          id={CATALOG_ANCHOR}
          heading={featured.length > 0 ? "Everything else" : "The range"}
        />
      )}

      {products.length > 0 && (
        <script
          type="application/ld+json"
          // Structured data for the listing. Individual Product/Offer markup
          // lives on each detail page, which is what actually competes in
          // search; this just tells crawlers what the listing contains.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Car Care Products",
              itemListElement: products.map((product, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `https://www.thelaunchpadwash.com/products/${product.slug}`,
                name: product.name,
              })),
            }),
          }}
        />
      )}
    </main>
  );
}
