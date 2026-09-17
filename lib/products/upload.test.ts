import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  rejectImage,
  storagePath,
  uploadTarget,
} from "./upload";

describe("uploadTarget", () => {
  it("routes each kind to its bucket and folder", () => {
    expect(uploadTarget("image")).toEqual({
      bucket: "product-images",
      folder: "products",
    });
    expect(uploadTarget("gallery")).toEqual({
      bucket: "product-images",
      folder: "products/gallery",
    });
    expect(uploadTarget("video")).toEqual({
      bucket: "product-videos",
      folder: "products",
    });
  });

  it("returns null for anything else, so an unknown kind cannot pick a bucket", () => {
    expect(uploadTarget("avatars")).toBeNull();
    expect(uploadTarget("")).toBeNull();
  });
});

describe("rejectImage", () => {
  it("accepts common image types", () => {
    expect(rejectImage({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(rejectImage({ type: "image/png", size: 1000 })).toBeNull();
    expect(rejectImage({ type: "image/webp", size: 1000 })).toBeNull();
  });

  it("rejects a non-image", () => {
    expect(rejectImage({ type: "application/pdf", size: 10 })).toMatch(/image/i);
  });

  it("rejects an oversized image, naming the limit", () => {
    expect(rejectImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toMatch(
      /10 MB/,
    );
  });

  it("accepts a file exactly at the ceiling", () => {
    expect(rejectImage({ type: "image/png", size: MAX_IMAGE_BYTES })).toBeNull();
  });
});

describe("storagePath", () => {
  it("keeps the extension and namespaces by folder", () => {
    const path = storagePath("products", "Tire Shine.JPG", 1700000000000);
    expect(path).toBe("products/1700000000000.jpg");
  });

  it("falls back to bin when there is no extension", () => {
    expect(storagePath("products", "noext", 1)).toBe("products/1.bin");
  });

  it("does not let a crafted filename escape the folder", () => {
    // "../../secret.png" must not become a path traversal.
    const path = storagePath("products", "../../secret.png", 5);
    expect(path).toBe("products/5.png");
  });

  it("strips anything non-alphanumeric from the extension", () => {
    expect(storagePath("products", "x.p n g!", 7)).toBe("products/7.png");
  });
});
