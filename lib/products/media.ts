// Product media helpers: reading the gallery JSON column and guarding video
// uploads before they reach Supabase Storage.
//
// The product-videos bucket enforces the same mime allowlist and size ceiling
// (20260918000000_product_media.sql). These checks exist so the admin gets a
// useful message instead of an opaque storage error -- the bucket, not this
// file, is the real guarantee.

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;

/** 25 MB, matching the product-videos bucket's file_size_limit. */
export const MAX_VIDEO_BYTES = 26_214_400;

/**
 * products.gallery is a jsonb column, so it can hold anything. Coerce it to the
 * string[] the UI expects, dropping entries that would render as broken images.
 */
export function toGallery(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim() !== "",
  );
}

/**
 * Returns an error message when the file cannot be uploaded, or null when it
 * can. Takes the structural shape rather than File so it is testable in Node.
 */
export function rejectVideo(file: { type: string; size: number }): string | null {
  if (!(VIDEO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Video must be an MP4 or WebM file.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    const mb = Math.round(MAX_VIDEO_BYTES / 1_048_576);
    return `Video must be under ${mb} MB. Compress it before uploading.`;
  }
  return null;
}
