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
 * Start an upload of product media (image, gallery image, video) or storefront
 * hero media (hero video, hero poster).
 *
 * The file itself never comes through here. A Vercel function rejects request
 * bodies over 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE) before this code runs,
 * which failed nearly every video. Instead the browser sends the file's name,
 * type and size; this route authorises with requireAdmin, validates, and
 * returns a signed upload URL minted with the service-role client. The browser
 * then uploads straight to Storage -- see uploadProductMedia.
 *
 * Signing with the service role keeps uploads independent of the
 * storage.objects RLS policies resolving for the signed-in admin, the failure
 * that surfaced as "new row violates row-level security policy". The
 * product-videos bucket's own type and size limits still apply to the upload.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    await requireAdmin(supabase, admin);

    const body = await req.json().catch(() => ({}));
    const kind = String(body.kind ?? "");
    const filename = String(body.filename ?? "");
    const type = String(body.type ?? "");
    const size = Number(body.size);

    if (!filename || !Number.isFinite(size) || size <= 0) {
      throw new ApiError("No file was uploaded", 400);
    }

    const target = uploadTarget(kind);
    if (!target) throw new ApiError("Unknown upload kind", 400);

    const problem = isVideoKind(kind)
      ? rejectVideo({ type, size })
      : rejectImage({ type, size });
    if (problem) throw new ApiError(problem, 400);

    const path = storagePath(
      target.folder,
      filename,
      Date.now(),
      crypto.randomUUID().slice(0, 8),
    );

    const storage = admin.storage.from(target.bucket);
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) {
      throw new ApiError(
        `Upload failed: ${error?.message ?? "no upload URL returned"}`,
        502,
      );
    }

    return NextResponse.json({
      bucket: target.bucket,
      path,
      token: data.token,
      url: storage.getPublicUrl(path).data.publicUrl,
    });
  } catch (err) {
    return apiError(err);
  }
}
