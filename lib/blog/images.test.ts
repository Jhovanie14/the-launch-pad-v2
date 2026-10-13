import { describe, expect, it } from "vitest";
import {
  blogImagePathFromUrl,
  blogImageUrl,
  imageMimeFromUrl,
  isBlogImageUrl,
  isBlogUploadPath,
  validateBlogImage,
} from "@/lib/blog/images";

const SUPA = "https://proj.supabase.co";
const BASE = `${SUPA}/storage/v1/object/public/blog-images/`;

describe("validateBlogImage", () => {
  it("accepts only JPG/PNG/WebP up to 5MB", () => {
    expect(validateBlogImage("image/jpeg", 1000)).toEqual({ ok: true, extension: "jpg" });
    expect(validateBlogImage("image/svg+xml", 1000).ok).toBe(false);
    expect(validateBlogImage("image/gif", 1000).ok).toBe(false);
    expect(validateBlogImage("image/png", 5 * 1024 * 1024 + 1).ok).toBe(false);
    expect(validateBlogImage("image/png", 0).ok).toBe(false);
  });
});

describe("upload paths", () => {
  it("accepts only paths the upload action mints", () => {
    expect(isBlogUploadPath("posts/2f1c8a52-8b0c-4b7e-9a51-0d6c2c4b9f10.webp")).toBe(true);
    expect(isBlogUploadPath("posts/anything.jpg")).toBe(false);
    expect(isBlogUploadPath("../documents/secret.pdf")).toBe(false);
  });
});

describe("isBlogImageUrl", () => {
  it("accepts new and legacy objects in the blog bucket", () => {
    expect(isBlogImageUrl(`${BASE}posts/2f1c8a52-8b0c-4b7e-9a51-0d6c2c4b9f10.jpg`, SUPA)).toBe(true);
    expect(isBlogImageUrl(`${BASE}cover-images/1712345678901.JPEG`, SUPA)).toBe(true);
  });

  it("refuses other buckets, other hosts, traversal and junk", () => {
    expect(isBlogImageUrl(`${SUPA}/storage/v1/object/public/avatars/x.jpg`, SUPA)).toBe(false);
    expect(isBlogImageUrl("https://evil.example/storage/v1/object/public/blog-images/x.jpg", SUPA)).toBe(false);
    expect(isBlogImageUrl(`${BASE}../avatars/x.jpg`, SUPA)).toBe(false);
    expect(isBlogImageUrl(`${BASE}posts//x.jpg`, SUPA)).toBe(false);
    expect(isBlogImageUrl(`${BASE}x.gif`, SUPA)).toBe(false);
    expect(isBlogImageUrl(42, SUPA)).toBe(false);
    expect(isBlogImageUrl(`${BASE}x.jpg`, "")).toBe(false);
  });
});

describe("url helpers", () => {
  it("round-trips a path", () => {
    const url = blogImageUrl("posts/a.png", SUPA);
    expect(url).toBe(`${BASE}posts/a.png`);
    expect(blogImagePathFromUrl(url, SUPA)).toBe("posts/a.png");
    expect(blogImagePathFromUrl("https://other/x.png", SUPA)).toBeNull();
  });

  it("guesses the mime type from the extension", () => {
    expect(imageMimeFromUrl(`${BASE}a.png`)).toBe("image/png");
    expect(imageMimeFromUrl(`${BASE}a.webp`)).toBe("image/webp");
    expect(imageMimeFromUrl(`${BASE}a.jpg`)).toBe("image/jpeg");
  });
});
