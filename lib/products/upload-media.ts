// Browser side of product media uploads. One function for every caller (the
// product form and the storefront hero settings) so the two-step flow lives in
// one place.

import { createClient } from "@/utils/supabase/client";
import type { UploadKind } from "./upload";

/**
 * Upload a file and return its public URL. Throws with a readable message.
 *
 * Step 1 asks /api/admin/product-media for a signed upload URL (the route
 * checks the caller is an admin and the file is acceptable). Step 2 sends the
 * file straight to Supabase Storage, so it never passes through a Vercel
 * function and its 4.5 MB request limit.
 */
export async function uploadProductMedia(
  kind: UploadKind,
  file: File,
): Promise<string> {
  const res = await fetch("/api/admin/product-media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      type: file.type,
      size: file.size,
    }),
  });
  const ticket = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ticket.error || `Upload failed (${res.status})`);

  const { error } = await createClient()
    .storage.from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
      // Every upload gets a fresh path, so the content behind a URL never changes.
      cacheControl: "31536000",
    });
  if (error) throw new Error(error.message);

  return ticket.url;
}
