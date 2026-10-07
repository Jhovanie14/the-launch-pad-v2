import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { formatPostDate } from "@/lib/blog/post";
import type { BlogCard as BlogCardData } from "@/lib/blog/rows";
import { cn } from "@/lib/utils";

/**
 * One post in a listing. `feature` is the wide first card on page one of
 * /blog — image beside the text on desktop rather than above it.
 */
export function BlogCard({
  post,
  feature = false,
  priority = false,
  headingLevel = "h2",
}: {
  post: BlogCardData;
  feature?: boolean;
  /** The first card on a listing sits above the fold. */
  priority?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const summary = (post.excerpt ?? post.metaDescription ?? "").trim();
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow duration-300 hover:shadow-md",
        feature && "md:grid md:grid-cols-[1.25fr_1fr]",
      )}
    >
      <div
        className={cn(
          "relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted",
          feature && "md:aspect-auto md:min-h-[22rem]",
        )}
      >
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.coverImageAlt ?? ""}
            fill
            priority={priority}
            sizes={feature ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground/40" aria-hidden />
        )}
      </div>
      <div className={cn("flex flex-1 flex-col p-6", feature && "md:justify-center md:p-10")}>
        {post.categoryName && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{post.categoryName}</p>
        )}
        <Heading
          className={cn(
            "mt-3 font-semibold tracking-tight text-blue-900",
            feature ? "text-2xl sm:text-3xl" : "text-xl",
          )}
        >
          {/* Stretched link: the whole card is clickable, one link in the tab order. */}
          <Link
            href={`/blog/${post.slug}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-blue-900 focus-visible:after:ring-offset-2"
          >
            {post.title}
          </Link>
        </Heading>
        {summary && (
          <p className={cn("mt-3 text-sm leading-relaxed text-muted-foreground", feature ? "line-clamp-4" : "line-clamp-3")}>
            {summary}
          </p>
        )}
        {post.publishedAt && (
          <p className="mt-auto pt-5 text-xs tabular-nums text-muted-foreground">
            <time dateTime={post.publishedAt.toISOString()}>{formatPostDate(post.publishedAt)}</time>
          </p>
        )}
      </div>
    </article>
  );
}
