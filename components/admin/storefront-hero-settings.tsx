"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import {
  HERO_LIMITS,
  type HeroSettings,
} from "@/lib/products/storefront";
import { MAX_VIDEO_BYTES, VIDEO_MIME_TYPES } from "@/lib/products/media";

/** Shown as placeholders — these are what /products falls back to when blank. */
const DEFAULTS = {
  headline: "Pro Series Car Care",
  subcopy:
    "Professional-grade detailing products, made for the finish we put on cars every day. Order online and collect at our S Main St store.",
  ctaLabel: "Explore the range",
};

const EMPTY: HeroSettings = {
  hero_video_url: null,
  hero_poster_url: null,
  hero_headline: null,
  hero_subcopy: null,
  hero_cta_label: null,
};

/**
 * The storefront hero, editable without a deploy.
 *
 * Reads come straight from store_settings (public read). Writes go through
 * /api/admin/store-settings and uploads through /api/admin/product-media,
 * both of which authorise server-side — the row's own update policy gates on a
 * subquery against profiles and is not dependable from the browser.
 */
export function StorefrontHeroSettings() {
  const supabase = createClient();

  const [hero, setHero] = useState<HeroSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"video" | "poster" | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("store_settings")
      .select(
        "hero_video_url, hero_poster_url, hero_headline, hero_subcopy, hero_cta_label",
      )
      .eq("id", 1)
      .maybeSingle();
    if (data) setHero({ ...EMPTY, ...data });
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field: keyof HeroSettings, value: string) =>
    setHero((prev) => ({ ...prev, [field]: value === "" ? null : value }));

  const upload = async (file: File, which: "video" | "poster") => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", which === "video" ? "hero-video" : "hero-poster");
    try {
      setUploading(which);
      const res = await fetch("/api/admin/product-media", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);
      setHero((prev) => ({
        ...prev,
        [which === "video" ? "hero_video_url" : "hero_poster_url"]: data.url,
      }));
      toast.success(`Hero ${which} uploaded — remember to save.`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error(`Error uploading hero ${which}:`, error);
      toast.error(`Failed to upload ${which}: ${detail}`);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/store-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hero),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      toast.success("Hero saved. The page updates within 5 minutes.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Storefront hero</CardTitle>
        <p className="text-sm text-muted-foreground">
          The background film and headline at the top of the Products page.
          Leave a field blank to use the default wording.
        </p>
      </CardHeader>

      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hero-video">Background video</Label>
          <Input
            id="hero-video"
            type="file"
            accept={VIDEO_MIME_TYPES.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file, "video");
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Landscape 16:9, no sound, under{" "}
            {Math.round(MAX_VIDEO_BYTES / 1_048_576)} MB. Export with
            &ldquo;fast start&rdquo; so it begins playing straight away.
          </p>
          {hero.hero_video_url && (
            <video
              src={hero.hero_video_url}
              muted
              controls
              playsInline
              className="w-full rounded-md"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero-poster">Poster image</Label>
          <Input
            id="hero-poster"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file, "poster");
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            A still from the video. Shown while the film loads, and the frame
            Google measures the page speed against.
          </p>
          {hero.hero_poster_url && (
            <Image
              src={hero.hero_poster_url}
              alt="Hero poster preview"
              width={320}
              height={180}
              className="rounded-md object-cover"
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero_headline">Headline</Label>
          <Input
            id="hero_headline"
            value={hero.hero_headline ?? ""}
            maxLength={HERO_LIMITS.hero_headline}
            placeholder={DEFAULTS.headline}
            onChange={(e) => set("hero_headline", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="hero_cta_label">Button label</Label>
          <Input
            id="hero_cta_label"
            value={hero.hero_cta_label ?? ""}
            maxLength={HERO_LIMITS.hero_cta_label}
            placeholder={DEFAULTS.ctaLabel}
            onChange={(e) => set("hero_cta_label", e.target.value)}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="hero_subcopy">Sub-heading</Label>
          <Textarea
            id="hero_subcopy"
            rows={3}
            value={hero.hero_subcopy ?? ""}
            maxLength={HERO_LIMITS.hero_subcopy}
            placeholder={DEFAULTS.subcopy}
            onChange={(e) => set("hero_subcopy", e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <Button onClick={save} disabled={saving || uploading !== null}>
            {saving || uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? `Uploading ${uploading}…` : saving ? "Saving…" : "Save hero"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
