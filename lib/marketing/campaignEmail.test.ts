import { describe, expect, it } from "vitest";
import {
  CAMPAIGN_LIMITS,
  RESEND_UNSUBSCRIBE_URL,
  buildCampaignHtml,
  campaignProblems,
  scheduleProblem,
} from "./campaignEmail";

const base = { subject: "Free tire shine this weekend", body: "Come by Saturday.\nAny wash, any plan." };

describe("campaignProblems", () => {
  it("accepts a subject and a message", () => {
    expect(campaignProblems(base)).toEqual([]);
  });

  it("needs a subject and a message", () => {
    expect(campaignProblems({ subject: "  ", body: "" })).toEqual([
      "Add a subject line.",
      "Write the message.",
    ]);
  });

  it("rejects a subject longer than the limit", () => {
    const subject = "x".repeat(CAMPAIGN_LIMITS.subject + 1);
    expect(campaignProblems({ ...base, subject })).toEqual([
      `Keep the subject under ${CAMPAIGN_LIMITS.subject} characters.`,
    ]);
  });

  it("rejects a banner that is not one of our uploaded images", () => {
    expect(campaignProblems({ ...base, bannerUrl: "https://evil.example.com/a.png" })).toEqual([
      "The banner must be an image uploaded to our storage (a supabase.co link).",
    ]);
  });
});

describe("buildCampaignHtml", () => {
  it("puts the unsubscribe link in the footer", () => {
    const html = buildCampaignHtml(base, { unsubscribeUrl: RESEND_UNSUBSCRIBE_URL });
    expect(html).toContain(`href="${RESEND_UNSUBSCRIBE_URL}"`);
    expect(html).toContain("Unsubscribe from product news and offers");
  });

  it("says why the customer is getting it", () => {
    const html = buildCampaignHtml(base, { unsubscribeUrl: RESEND_UNSUBSCRIBE_URL });
    expect(html).toContain("you asked for news and offers");
  });

  it("escapes what the admin typed", () => {
    const html = buildCampaignHtml(
      { subject: "<b>Hi</b>", body: "<script>alert(1)</script>" },
      { unsubscribeUrl: RESEND_UNSUBSCRIBE_URL },
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses the preview text as the inbox preview line when given", () => {
    const html = buildCampaignHtml(
      { ...base, previewText: "Saturday only" },
      { unsubscribeUrl: RESEND_UNSUBSCRIBE_URL },
    );
    expect(html).toContain("Saturday only");
  });
});

describe("scheduleProblem", () => {
  const now = new Date("2026-11-12T15:00:00.000Z");

  it("allows no schedule (send now)", () => {
    expect(scheduleProblem(undefined, now)).toBeNull();
  });

  it("allows a time later today", () => {
    expect(scheduleProblem("2026-11-12T18:00:00.000Z", now)).toBeNull();
  });

  it("rejects a time in the past or in the next few minutes", () => {
    expect(scheduleProblem("2026-11-12T15:02:00.000Z", now)).toBe("Pick a time at least 5 minutes from now.");
  });

  it("rejects a time more than 30 days out", () => {
    expect(scheduleProblem("2026-12-13T15:00:00.000Z", now)).toBe("Pick a time within the next 30 days.");
  });

  it("rejects something that is not a date", () => {
    expect(scheduleProblem("next tuesday-ish", now)).toBe("That send time isn't a valid date.");
  });
});
