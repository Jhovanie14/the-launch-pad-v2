"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { confirmBlogImageUpload, requestBlogImageUpload } from "@/app/actions/blog";
import { Input } from "@/components/ui/input";
import { BLOG_BUCKET, BLOG_IMAGE_MIME_TYPES, validateBlogImage } from "@/lib/blog/images";
import { BLOG_LIMITS } from "@/lib/blog/post";
import { createClient } from "@/utils/supabase/client";

/**
 * Cover image + its alt text. The upload goes browser → Storage on a signed
 * URL minted by an admin action, then the action re-checks the stored object
 * (type and size) before the URL is accepted. The post records the URL only
 * when it is saved.
 */
export function CoverImageField({
  url,
  alt,
  onUrlChange,
  onAltChange,
  error,
}: {
  url: string | null;
  alt: string;
  onUrlChange: (url: string | null) => void;
  onAltChange: (alt: string) => void;
  error?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function upload(file: File) {
    const check = validateBlogImage(file.type, file.size);
    if (!check.ok) {
      setUploadError(check.error);
      return;
    }
    setUploadError(null);
    setBusy(true);
    try {
      const ticket = await requestBlogImageUpload(file.type, file.size);
      if (!ticket.ok) {
        setUploadError(ticket.error);
        return;
      }
      const { error: upErr } = await createClient()
        .storage.from(BLOG_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          // Every upload is a fresh uuid path, so its content never changes.
          cacheControl: "31536000",
        });
      if (upErr) {
        setUploadError(`Upload failed — ${upErr.message}`);
        return;
      }
      const confirmed = await confirmBlogImageUpload(ticket.path);
      if (!confirmed.ok) {
        setUploadError(confirmed.error);
        return;
      }
      onUrlChange(ticket.url);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const altMissing = !!url && !alt.trim();

  return (
    <div className="grid gap-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted/50">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of a just-uploaded object; the public page uses next/image
          <img src={url} alt={alt || "Cover image preview"} className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
            {busy ? "Uploading…" : "Upload a cover image"}
            <span className="text-xs">JPG, PNG or WebP, up to 5 MB. Landscape, at least 1600px wide.</span>
          </button>
        )}
        {url && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="absolute bottom-3 right-3 inline-flex h-9 items-center gap-2 rounded-full bg-background/95 px-4 text-sm font-medium text-foreground shadow-sm hover:bg-background"
          >
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            {busy ? "Uploading…" : "Replace"}
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={BLOG_IMAGE_MIME_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      {(uploadError || error) && (
        <p role="alert" className="text-xs text-destructive">
          {uploadError ?? error}
        </p>
      )}

      <label className="grid gap-2">
        <span className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Image description (alt text)</span>
          <span className="text-xs text-muted-foreground">Required to publish</span>
        </span>
        <Input
          value={alt}
          onChange={(e) => onAltChange(e.target.value)}
          maxLength={BLOG_LIMITS.coverAlt}
          placeholder="e.g. A detailer polishing the hood of a black SUV in our Houston bay"
          aria-invalid={altMissing ? true : undefined}
        />
        <span className={altMissing ? "text-xs text-amber-700" : "text-xs leading-relaxed text-muted-foreground"}>
          {altMissing
            ? "Describe what the picture shows — it is read aloud to blind visitors and used by Google Images."
            : "Say what is in the picture, in a sentence. Mention the keyword only if it genuinely describes the image."}
        </span>
      </label>
    </div>
  );
}
