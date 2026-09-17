import { describe, expect, it } from "vitest";
import {
  MAX_VIDEO_BYTES,
  VIDEO_MIME_TYPES,
  rejectVideo,
  toGallery,
} from "./media";

describe("toGallery", () => {
  it("passes through an array of urls", () => {
    expect(toGallery(["/a.jpg", "/b.jpg"])).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("returns an empty array for null, the column default, and junk", () => {
    expect(toGallery(null)).toEqual([]);
    expect(toGallery([])).toEqual([]);
    expect(toGallery("/a.jpg")).toEqual([]);
    expect(toGallery({ 0: "/a.jpg" })).toEqual([]);
    expect(toGallery(undefined)).toEqual([]);
  });

  it("drops non-string and blank entries rather than rendering broken images", () => {
    expect(toGallery(["/a.jpg", 42, null, "", "  ", "/b.jpg"])).toEqual([
      "/a.jpg",
      "/b.jpg",
    ]);
  });
});

describe("rejectVideo", () => {
  const file = (type: string, size: number) => ({ type, size });

  it("accepts an mp4 within the size ceiling", () => {
    expect(rejectVideo(file("video/mp4", 2_000_000))).toBeNull();
  });

  it("accepts webm", () => {
    expect(rejectVideo(file("video/webm", 2_000_000))).toBeNull();
  });

  it("rejects a non-video file", () => {
    expect(rejectVideo(file("image/png", 1000))).toMatch(/MP4 or WebM/);
  });

  it("rejects a video format the storage bucket will not accept", () => {
    expect(rejectVideo(file("video/quicktime", 1000))).toMatch(/MP4 or WebM/);
  });

  it("rejects a file over the ceiling, naming the limit", () => {
    const message = rejectVideo(file("video/mp4", MAX_VIDEO_BYTES + 1));
    expect(message).toMatch(/25 MB/);
  });

  it("accepts a file exactly at the ceiling", () => {
    expect(rejectVideo(file("video/mp4", MAX_VIDEO_BYTES))).toBeNull();
  });

  it("exposes the mime allowlist for the file input", () => {
    expect(VIDEO_MIME_TYPES).toEqual(["video/mp4", "video/webm"]);
  });
});
