import { describe, expect, it } from "vitest";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd, jsonLdString } from "@/lib/blog/json-ld";

const base = {
  url: "https://www.thelaunchpadwash.com/blog/a",
  headline: "A",
  description: "D",
  imageUrl: null,
  datePublished: new Date("2026-10-01T09:00:00Z"),
  dateModified: new Date("2026-10-02T09:00:00Z"),
  section: null,
  keyword: null,
};

describe("JSON-LD", () => {
  it("cannot be broken out of its script tag by a title", () => {
    const out = jsonLdString({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).headline).toBe("</script><script>alert(1)</script>");
  });

  it("credits the business by default and a person when named", () => {
    expect(articleJsonLd({ ...base, authorName: "The Launch Pad" }).author["@type"]).toBe("Organization");
    expect(articleJsonLd({ ...base, authorName: "Sam Rivera" }).author).toEqual({ "@type": "Person", name: "Sam Rivera" });
  });

  it("names The Launch Pad as publisher, in US English", () => {
    const ld = articleJsonLd({ ...base, authorName: "The Launch Pad" });
    expect(ld.publisher.name).toBe("The Launch Pad");
    expect(ld.inLanguage).toBe("en-US");
    expect(ld).not.toHaveProperty("image");
  });

  it("truncates the headline at 110 characters", () => {
    expect(articleJsonLd({ ...base, headline: "x".repeat(150), authorName: "x" }).headline).toHaveLength(110);
  });

  it("numbers breadcrumb positions from 1", () => {
    const ld = breadcrumbJsonLd([{ name: "Home", url: "u1" }, { name: "Blog", url: "u2" }]);
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("emits no FAQPage without FAQs", () => {
    expect(faqJsonLd([])).toBeNull();
    expect(faqJsonLd([{ question: "Q", answer: "A" }])?.mainEntity).toHaveLength(1);
  });
});
