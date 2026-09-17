import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openGraph, twitter } from "@/lib/seo/openGraph";
import { unitPrice } from "@/lib/products/cart";
import { toGallery } from "@/lib/products/media";
import { getActiveProducts, getProductBySlug } from "@/lib/products/queries";
import { ProductVideo } from "@/components/products/product-video";
import { ProductGallery } from "@/components/products/product-gallery";
import { TrackViewItem } from "@/components/products/track-view-item";
import { ProductCard } from "@/components/products/product-card";
import { AddToCartButton, PriceTag } from "@/components/products/product-actions";

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

  const all = await getActiveProducts();
  const related = all
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);

  // The primary image leads the gallery, with the extra shots behind it.
  const images = [
    ...(product.image_url ? [product.image_url] : []),
    ...toGallery(product.gallery),
  ];

  const price = unitPrice(product);

  return (
    <main className="flex-1">
      <TrackViewItem product={product} />

      {product.video_url && (
        <ProductVideo
          src={product.video_url}
          poster={product.image_url}
          alt={product.name}
          priority
          sizes="100vw"
          className="aspect-video max-h-[70svh] w-full"
        />
      )}

      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-8 rounded-none uppercase tracking-widest"
        >
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" /> All products
          </Link>
        </Button>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={images} alt={product.name} />

          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">
              {product.category}
            </p>
            <h1 className="mt-4 font-display text-4xl uppercase leading-tight sm:text-5xl">
              {product.name}
            </h1>

            <PriceTag product={product} size="lg" className="mt-6" />

            {product.description && (
              <p className="mt-6 whitespace-pre-line text-muted-foreground">
                {product.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <AddToCartButton product={product} size="lg" />
              {product.stock > 0 && product.stock <= 5 && (
                <span className="text-sm text-gold-soft">
                  Only {product.stock} left
                </span>
              )}
            </div>

            <dl className="mt-10 space-y-3 border-t border-border/60 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-gold" />
                <span>Collect at 10410 S Main St, Houston</span>
              </div>
              <div className="flex items-center gap-3">
                <PackageCheck className="h-4 w-4 shrink-0 text-gold" />
                <span>We email you as soon as it is ready</span>
              </div>
            </dl>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-24 border-t border-border/60 pt-16">
            <h2 className="font-display text-3xl uppercase">More in {product.category}</h2>
            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item, index) => (
                <ProductCard key={item.id} product={item} index={index} />
              ))}
            </div>
          </section>
        )}
      </div>

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
