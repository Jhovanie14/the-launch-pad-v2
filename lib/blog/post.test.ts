import { describe, expect, it } from "vitest";
import {
  formatPostDate,
  introParagraphs,
  legacyContentToBody,
  normaliseBody,
  normaliseFaq,
  pageFromParam,
  postDayKey,
  postSummary,
  readingMinutes,
  sectionAnchors,
} from "@/lib/blog/post";

describe("normalisers", () => {
  it("drops half-filled FAQ pairs", () => {
    expect(
      normaliseFaq([{ question: "Q?", answer: "A." }, { question: "No answer", answer: "" }, "junk"]),
    ).toEqual([{ question: "Q?", answer: "A." }]);
  });

  it("returns the empty template for junk bodies", () => {
    expect(normaliseBody("nope")).toEqual({ intro: "", sections: [] });
    expect(normaliseBody({ intro: 5, sections: [{ heading: "H", content: { type: "x" } }] })).toEqual({
      intro: "",
      sections: [{ heading: "H", content: { type: "doc", content: [] } }],
    });
  });

  it("splits the intro into paragraphs on blank lines", () => {
    expect(introParagraphs("One\nline\n\nTwo")).toEqual(["One line", "Two"]);
  });

  it("gives duplicate headings distinct anchors", () => {
    expect(sectionAnchors([{ heading: "Costs" }, { heading: "Costs" }, { heading: "" }])).toEqual([
      "costs",
      "costs-2",
      "section-3",
    ]);
  });
});

describe("legacyContentToBody", () => {
  const para = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });

  it("makes the first paragraph the intro and the rest one untitled section", () => {
    expect(legacyContentToBody("First line\nwraps\n\nSecond\n\n\nThird")).toEqual({
      intro: "First line wraps",
      sections: [{ heading: "", content: { type: "doc", content: [para("Second"), para("Third")] } }],
    });
  });

  it("handles Windows line endings", () => {
    expect(legacyContentToBody("One\r\n\r\nTwo").intro).toBe("One");
    expect(legacyContentToBody("One\r\n\r\nTwo").sections).toHaveLength(1);
  });

  it("produces no section from a single paragraph", () => {
    expect(legacyContentToBody("Only this")).toEqual({ intro: "Only this", sections: [] });
  });

  it("returns the empty template for nothing", () => {
    expect(legacyContentToBody(null)).toEqual({ intro: "", sections: [] });
    expect(legacyContentToBody("  \n\n  ")).toEqual({ intro: "", sections: [] });
  });
});

describe("reading helpers", () => {
  it("never reports less than a minute", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(1100)).toBe(5);
  });

  it("summarises from excerpt, then meta description, then intro", () => {
    const body = { intro: "Intro text.", sections: [] };
    expect(postSummary({ excerpt: " Ex ", metaDescription: "Meta", body })).toBe("Ex");
    expect(postSummary({ excerpt: null, metaDescription: "Meta", body })).toBe("Meta");
    expect(postSummary({ excerpt: "", metaDescription: null, body })).toBe("Intro text.");
  });
});

describe("dates", () => {
  it("formats and keys days in Houston time", () => {
    // 03:00 UTC on 2 Oct is still 1 Oct in Houston.
    const d = new Date("2026-10-02T03:00:00Z");
    expect(formatPostDate(d)).toBe("October 1, 2026");
    expect(postDayKey(d)).toBe("2026-10-01");
  });
});

describe("pageFromParam", () => {
  it("accepts whole numbers above one and defaults everything else to 1", () => {
    expect(pageFromParam("3")).toBe(3);
    expect(pageFromParam(["2", "5"])).toBe(2);
    expect(pageFromParam(undefined)).toBe(1);
    expect(pageFromParam("abc")).toBe(1);
    expect(pageFromParam("0")).toBe(1);
    expect(pageFromParam("-4")).toBe(1);
    expect(pageFromParam("2.5")).toBe(1);
  });
});
