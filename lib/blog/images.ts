/**
 * Blog cover images live in the PUBLIC `blog-images` Storage bucket: covers
 * must be fetchable by crawlers and link-preview bots (og:image) with no
 * session, at a stable URL.
 *
 * New uploads get a fresh uuid path (`posts/<uuid>.<ext>`), so a URL's content
 * never changes and can be cached for a year. Posts written before the
 * template stored `cover-images/<timestamp>.<ext>`; those URLs stay valid.
 *
 * The bucket's own size cap and MIME allow-list (set by the 20261007 migration)
 * are the real enforcement; validateBlogImage gives the same answer earlier.
 */

export const BLOG_BUCKET = "blog-images";
export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXTENSION: Record<(typeof BLOG_IMAGE_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function validateBlogImage(
  mime: string,
  sizeBytes: number,
): { ok: true; extension: string } | { ok: false; error: string } {
  if (!(BLOG_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
    return { ok: false, error: "Use a JPG, PNG or WebP image." };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (sizeBytes > BLOG_IMAGE_MAX_BYTES) {
    return { ok: false, error: "Images must be 5 MB or smaller." };
  }
  return { ok: true, extension: EXTENSION[mime as keyof typeof EXTENSION] };
}

const UPLOAD_PATH =
  /^posts\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/** Only paths the upload action mints are confirmed. */
export function isBlogUploadPath(path: unknown): path is string {
  return typeof path === "string" && UPLOAD_PATH.test(path);
}

export function newBlogImagePath(extension: string): string {
  return `posts/${crypto.randomUUID()}.${extension}`;
}

function bucketBase(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${BLOG_BUCKET}/`;
}

function envUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

/** Absolute public URL — usable by next/image, og:image and JSON-LD alike. */
export function blogImageUrl(path: string, supabaseUrl: string = envUrl()): string {
  return `${bucketBase(supabaseUrl)}${path}`;
}

/** Folder segments and a file name of safe characters, ending in an image extension. */
const SAFE_OBJECT = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:jpe?g|png|webp)$/i;

/**
 * True only for an object in OUR blog bucket — so a forged save cannot point a
 * post's cover (and its og:image) at an arbitrary host or another bucket.
 */
export function isBlogImageUrl(url: unknown, supabaseUrl: string = envUrl()): url is string {
  if (typeof url !== "string" || !/^https?:\/\//.test(supabaseUrl)) return false;
  const base = bucketBase(supabaseUrl);
  return url.startsWith(base) && SAFE_OBJECT.test(url.slice(base.length));
}

export function blogImagePathFromUrl(url: string, supabaseUrl: string = envUrl()): string | null {
  return isBlogImageUrl(url, supabaseUrl) ? url.slice(bucketBase(supabaseUrl).length) : null;
}

export function imageMimeFromUrl(url: string): string {
  if (/\.png$/i.test(url)) return "image/png";
  if (/\.webp$/i.test(url)) return "image/webp";
  return "image/jpeg";
}
