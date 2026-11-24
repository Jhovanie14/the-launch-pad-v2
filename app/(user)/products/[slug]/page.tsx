import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { openGraph, twitter } from "@/lib/seo/openGraph";
import { unitPrice } from "@/lib/products/cart";
import { toGallery } from "@/lib/products/media";
import { parseDescription, productTitle } from "@/lib/products/describe";
import { getActiveProducts, getProductBySlug, getStoreSettings } from "@/lib/products/queries";
import { ProductGallery } from "@/components/products/product-gallery";
import { TrackViewItem } from "@/components/products/track-view-item";
import { ProductCard } from "@/components/products/product-card";
import { PriceTag } from "@/components/products/product-actions";
import { BuyBox, PhoneBuyBar } from "@/components/products/BuyBox";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";

export const revalidate = 300;

const SITE = "https://www.thelaunchpadwash.com";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Prerender every product that exists at build time. Products added later are
 * still served -- dynamicParams is on by default -- they just render on the
 * first request and are cached from then on.
 */
export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // A missing product still renders 404 below; this stops the page inheriting
  // the catalog's title and canonical while it does.
  if (!product) {
    return { title: "Product not found", robots: { index: false } };
  }

  const description =
    product.description?.slice(0, 160) ||
    `${product.name} from The Launch Pad. Order online and collect at our Houston store on S Main St.`;
  const path = `/products/${product.slug}`;

  return {
    title: product.name,
    description,
    alternates: { canonical: path },
    openGraph: openGraph({ title: product.name, description, path }),
    twitter: twitter({ title: product.name, description }),
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [all, settings] = await Promise.all([getActiveProducts(), getStoreSettings()]);
  // Same category first; other products fill the row when there aren't enough.
  const others = all.filter((p) => p.id !== product.id);
  const related = [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, 4);

  // The primary image leads the gallery, with the extra shots behind it.
  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...toGallery(product.gallery),
  ];

  const price = unitPrice(product);
  const title = productTitle(product);
  const { about, specs } = parseDescription(product.description);
  const pickupHours = settings?.pickup_hours?.trim() || null;

  return (
    <main className="lp-theme flex-1 bg-canvas text-ink">
      <TrackViewItem product={product} />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-8">
        <Link
          href="/products"
          className={cn("inline-flex h-11 items-center gap-2 rounded-lg px-1 text-sm font-semibold text-ink-muted hover:text-ink", FOCUS_ON_LIGHT)}
        >
          <ArrowLeft aria-hidden className="size-4" /> All products
        </Link>

        <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <ProductGallery
            images={images}
            alt={title}
            video={product.video_url ? { src: product.video_url, poster: product.image_url } : null}
          />

          <div>
            <h1
              className={cn(
                "leading-[1.05] font-black tracking-tight text-balance",
                // A full marketplace name (no short display name yet) would fill a phone screen.
                title.length > 48 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
              )}
            >
              {title}
            </h1>
            {title !== product.name && <p className="mt-2 text-ink-muted">{product.name}</p>}
            <p className="mt-2 text-sm text-ink-subtle">{product.category}</p>

            <PriceTag product={product} size="lg" className="mt-5" />
            <BuyBox product={product} title={title} />

            <div className={cn(SURFACE, "mt-6 flex gap-3 p-4 text-sm leading-relaxed")}>
              <MapPin aria-hidden className="mt-0.5 size-5 shrink-0 text-brand-blue" />
              <div className="text-ink-muted">
                <p className="font-semibold text-ink">Pick up at 10410 S Main St</p>
                {pickupHours && <p>Pickup hours: {pickupHours}</p>}
                <p>Pay by card now or at the counter when you collect. We email you when it&apos;s ready.</p>
              </div>
            </div>
          </div>
        </div>

        {(about.length > 0 || specs.length > 0) && (
          <div className="mt-12 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            {about.length > 0 && (
              <section aria-labelledby="about-heading">
                <h2 id="about-heading" className="text-xl font-black tracking-tight">About this product</h2>
                <div className="mt-3 max-w-prose space-y-3 leading-relaxed text-ink-muted">
                  {about.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </section>
            )}
            {specs.length > 0 && (
              <section aria-labelledby="specs-heading">
                <h2 id="specs-heading" className="text-xl font-black tracking-tight">Specs</h2>
                <dl className={cn(SURFACE, "mt-3 divide-y divide-line-soft px-4 text-sm")}>
                  {specs.map((spec) => (
                    <div key={spec.label} className="flex justify-between gap-4 py-3">
                      <dt className="text-ink-muted">{spec.label}</dt>
                      <dd className="text-right font-semibold">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}

        {related.length > 0 && (
          <section aria-labelledby="more-heading" className="mt-14">
            <h2 id="more-heading" className="text-xl font-black tracking-tight">More products</h2>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {related.map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <PhoneBuyBar product={product} title={title} />

      <script
        type="application/ld+json"
        // This is the markup that competes in search: a product page with a
        // price, availability and image is what Google can show as a rich
        // result for "tire shine houston" and the like.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description ?? undefined,
            image: images.length > 0 ? images : undefined,
            category: product.category,
            brand: { "@type": "Brand", name: "The Launch Pad" },
            offers: {
              "@type": "Offer",
              url: `${SITE}/products/${product.slug}`,
              priceCurrency: "USD",
              price: price.toFixed(2),
              availability:
                product.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              seller: { "@type": "Organization", name: "The Launch Pad" },
            },
          }),
        }}
      />
    </main>
  );
}
