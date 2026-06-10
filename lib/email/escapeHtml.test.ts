import { describe, expect, it } from "vitest";
import { escapeHtml, isAllowedBannerUrl } from "./escapeHtml";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")&'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;&lt;/script&gt;"
    );
  });
  it("returns empty string for nullish input", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("isAllowedBannerUrl", () => {
  it("allows https URLs on the Supabase storage host", () => {
    expect(
      isAllowedBannerUrl(
        "https://knbixjluxzodnisuhkii.supabase.co/storage/v1/object/public/x.png"
      )
    ).toBe(true);
  });
  it("rejects other hosts and non-https", () => {
    expect(isAllowedBannerUrl("https://evil.com/x.png")).toBe(false);
    expect(isAllowedBannerUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedBannerUrl("")).toBe(false);
    expect(isAllowedBannerUrl(undefined)).toBe(false);
  });
});
