// Validation and destination rules for product media uploads.
//
// Pure so the API route stays thin and these rules can be tested without a
// request. The route is the only writer: uploads go through the service-role
// client server-side, the same way every other privileged write in this app
// does, rather than relying on storage RLS from the browser.

export const MAX_IMAGE_BYTES = 10_485_760; // 10 MB

export type UploadKind = "image" | "gallery" | "video";

export interface UploadTarget {
  bucket: "product-images" | "product-videos";
  folder: string;
}

const TARGETS: Record<UploadKind, UploadTarget> = {
  image: { bucket: "product-images", folder: "products" },
  gallery: { bucket: "product-images", folder: "products/gallery" },
  video: { bucket: "product-videos", folder: "products" },
};

/**
 * Resolve the bucket and folder for a kind. Returns null for anything not on
 * the list, so a caller-supplied string can never choose an arbitrary bucket.
 */
export function uploadTarget(kind: string): UploadTarget | null {
  return TARGETS[kind as UploadKind] ?? null;
}

/** Error message if the image cannot be accepted, else null. */
export function rejectImage(file: { type: string; size: number }): string | null {
  // SVG is excluded deliberately: these buckets are public and an SVG is a
  // document that can carry script, not just pixels.
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return "File must be an image (JPEG, PNG, WebP or AVIF).";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `Image must be under ${Math.round(MAX_IMAGE_BYTES / 1_048_576)} MB.`;
  }
  return null;
}

/**
 * Build the object path. Only the extension is taken from the uploaded
 * filename — the name itself is discarded — so a crafted name cannot traverse
 * out of the folder or collide with another object.
 */
export function storagePath(
  folder: string,
  filename: string,
  now: number,
): string {
  const dot = filename.lastIndexOf(".");
  const raw = dot === -1 ? "" : filename.slice(dot + 1);
  const ext = raw.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  return `${folder}/${now}.${ext}`;
}
