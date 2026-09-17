import { splitCatalog } from "@/lib/products/catalog";
import { getActiveProducts, getStoreSettings } from "@/lib/products/queries";
import { StorefrontHero } from "@/components/products/storefront-hero";
import { FeaturedProduct } from "@/components/products/featured-product";
import { ProductCatalog } from "@/components/products/product-catalog";

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
    <main className="flex-1">
      <StorefrontHero
        videoUrl={settings?.hero_video_url ?? null}
        posterUrl={settings?.hero_poster_url ?? null}
        headline={settings?.hero_headline || FALLBACK_HERO.headline}
        subcopy={settings?.hero_subcopy || FALLBACK_HERO.subcopy}
        ctaLabel={settings?.hero_cta_label || FALLBACK_HERO.ctaLabel}
        targetId={CATALOG_ANCHOR}
      />

      {featured.map((product, index) => (
        <FeaturedProduct key={product.id} product={product} index={index} />
      ))}

      {products.length === 0 ? (
        <section className="border-t border-border/60 py-32 text-center">
          <p className="text-muted-foreground">
            The range is arriving shortly. Check back soon.
          </p>
        </section>
      ) : (
        <ProductCatalog
          products={gridProducts}
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
