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
  const text = (t: string, bold = false) =>
    bold ? { type: "text", text: t, marks: [{ type: "bold" }] } : { type: "text", text: t };
  const p = (...content: unknown[]) => ({ type: "paragraph", content });
  const ul = (...items: string[]) => ({
    type: "bulletList",
    content: items.map((i) => ({ type: "listItem", content: [p(text(i))] })),
  });
  const doc = (...content: unknown[]) => ({ type: "doc", content });

  it("drops a first block that repeats the title", () => {
    const body = legacyContentToBody("How Do You Use a Self-Service Car Wash?\n\nStart here.", "How Do You Use a Self-Service Car Wash?");
    expect(body.intro).toBe("Start here.");
  });

  it("turns short unpunctuated lines into section headings, keeping step numbers", () => {
    const body = legacyContentToBody(
      "Opening line.\n\n1. Park Your Vehicle in the Wash Bay\n\nPull into a bay.\n\nBugs Become More Common During Summer\n\nSummer is bug season.",
    );
    expect(body.intro).toBe("Opening line.");
    expect(body.sections).toEqual([
      { heading: "1. Park Your Vehicle in the Wash Bay", content: doc(p(text("Pull into a bay."))) },
      { heading: "Bugs Become More Common During Summer", content: doc(p(text("Summer is bug season."))) },
    ]);
  });

  it("keeps questions and short sentences as paragraphs", () => {
    const body = legacyContentToBody("Intro.\n\nWhat order should I use the settings?\n\nUnfortunately, that is not what happens.");
    expect(body.sections).toEqual([
      {
        heading: "",
        content: doc(p(text("What order should I use the settings?")), p(text("Unfortunately, that is not what happens."))),
      },
    ]);
  });

  it("reads blocks of short lines as bullet lists, with or without markers", () => {
    const body = legacyContentToBody(
      "Intro.\n\nWhat Builds Up\n\nYour car may collect:\n\nDust\nPollen\nRoad film\n\n- Fewer swirls\n- Less fading",
    );
    expect(body.sections[0]).toEqual({
      heading: "What Builds Up",
      content: doc(p(text("Your car may collect:")), ul("Dust", "Pollen", "Road film"), ul("Fewer swirls", "Less fading")),
    });
  });

  it("splits a post typed with single line breaks into its paragraphs and headings", () => {
    const body = legacyContentToBody(
      "Fall brings cooler temperatures and plenty of debris.\nFallen Leaves Can Be Hard on Your Car\nLeaves trap moisture against the paint.\nThey also stain clear coat.",
    );
    expect(body).toEqual({
      intro: "Fall brings cooler temperatures and plenty of debris.",
      sections: [
        {
          heading: "Fallen Leaves Can Be Hard on Your Car",
          content: doc(p(text("Leaves trap moisture against the paint.")), p(text("They also stain clear coat."))),
        },
      ],
    });
  });

  it("joins wrapped sentence lines into one paragraph", () => {
    const body = legacyContentToBody("Intro.\n\nCome in anytime, as often as you like.  \nPerfect for busy drivers who want a spotless car.");
    expect(body.sections[0].content).toEqual(
      doc(p(text("Come in anytime, as often as you like. Perfect for busy drivers who want a spotless car."))),
    );
  });

  it("understands markdown headings, rules and bold", () => {
    const body = legacyContentToBody(
      "# Top 5 Benefits of Joining\n\nWhen you join our **Car Wash Club**, you save.\n\n---\n\n## 1. Unlimited Washes\n\nCome in anytime.\n\n### The fine print\n\nNo contract.",
    );
    expect(body.intro).toBe("When you join our Car Wash Club, you save.");
    expect(body.sections).toEqual([
      {
        heading: "1. Unlimited Washes",
        content: doc(
          p(text("Come in anytime.")),
          { type: "heading", attrs: { level: 3 }, content: [text("The fine print")] },
          p(text("No contract.")),
        ),
      },
    ]);
  });

  it("keeps bold inside section paragraphs", () => {
    const body = legacyContentToBody("Intro.\n\nDiscounts\n\nSubscribers get **15% off** detailing.");
    expect(body.sections[0].content).toEqual(doc(p(text("Subscribers get "), text("15% off", true), text(" detailing."))));
  });

  it("starts an untitled section when a list comes before the first heading", () => {
    const body = legacyContentToBody("Intro.\n\nWe offer:\n\nWashing\nWaxing\n\nWhy Members Save\n\nOne price.");
    expect(body.intro).toBe("Intro.");
    expect(body.sections.map((s) => s.heading)).toEqual(["", "Why Members Save"]);
  });

  it("with no headings, keeps the first paragraph as the intro and the rest as one section", () => {
    expect(legacyContentToBody("First line\nwraps on.\n\nSecond one.\n\n\nThird one.")).toEqual({
      intro: "First line wraps on.",
      sections: [{ heading: "", content: doc(p(text("Second one.")), p(text("Third one."))) }],
    });
  });

  it("handles Windows line endings", () => {
    const body = legacyContentToBody("One.\r\n\r\nTwo.");
    expect(body.intro).toBe("One.");
    expect(body.sections).toHaveLength(1);
  });

  it("produces no section from a single paragraph", () => {
    expect(legacyContentToBody("Only this.")).toEqual({ intro: "Only this.", sections: [] });
  });

  it("returns the empty template for nothing", () => {
    expect(legacyContentToBody(null)).toEqual({ intro: "", sections: [] });
    expect(legacyContentToBody("  \n\n  ")).toEqual({ intro: "", sections: [] });
    expect(legacyContentToBody("Same Title", "Same Title")).toEqual({ intro: "", sections: [] });
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
