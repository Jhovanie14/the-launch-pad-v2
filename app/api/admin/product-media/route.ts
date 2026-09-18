import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { apiError, ApiError } from "@/lib/http/apiError";
import { rejectVideo } from "@/lib/products/media";
import {
  isVideoKind,
  rejectImage,
  storagePath,
  uploadTarget,
} from "@/lib/products/upload";

/**
 * Upload product media (image, gallery image, video) or storefront hero
 * media (hero video, hero poster).
 *
 * Uploading straight from the browser meant every upload depended on the
 * storage.objects RLS policies resolving correctly for the signed-in admin,
 * which failed opaquely with "new row violates row-level security policy".
 * This follows the pattern the rest of the app already uses for privileged
 * writes (see the product_orders policies, which are deliberately absent):
 * authorise here with requireAdmin, then write with the service-role client.
 *
 * Authorisation is therefore enforced by this route, not by storage policies.
 * The policies stay in place as defence in depth for anything else holding a
 * user token.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const form = await req.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "");

    if (!(file instanceof File)) {
      throw new ApiError("No file was uploaded", 400);
    }

    const target = uploadTarget(kind);
    if (!target) throw new ApiError("Unknown upload kind", 400);

    const problem = isVideoKind(kind)
      ? rejectVideo({ type: file.type, size: file.size })
      : rejectImage({ type: file.type, size: file.size });
    if (problem) throw new ApiError(problem, 400);

    const path = storagePath(target.folder, file.name, Date.now());

    const { error: uploadError } = await admin.storage
      .from(target.bucket)
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      // Surface the storage message: at this point the caller is a verified
      // admin, so it is a genuine storage problem worth reading.
      throw new ApiError(`Upload failed: ${uploadError.message}`, 502);
    }

    const { data } = admin.storage.from(target.bucket).getPublicUrl(path);
    if (!data?.publicUrl) {
      throw new ApiError("Upload succeeded but no public URL was returned", 500);
    }

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return apiError(err);
  }
}
