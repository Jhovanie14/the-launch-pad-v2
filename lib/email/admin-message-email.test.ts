import { describe, expect, it } from "vitest";
import { buildDirectEmailHtml, parseDirectEmailRequest } from "./admin-message-email";

describe("parseDirectEmailRequest", () => {
  it("trims the address, subject and title", () => {
    const r = parseDirectEmailRequest({
      to: "  sam@example.com ",
      subject: " Your Launch Pad membership has ended ",
      title: "  Hello ",
      body: "Line one\nLine two",
    });
    expect(r).toEqual({
      ok: true,
      value: {
        to: "sam@example.com",
        subject: "Your Launch Pad membership has ended",
        title: "Hello",
        body: "Line one\nLine two",
        bannerUrl: undefined,
      },
    });
  });

  it("drops a title that is only spaces", () => {
    const r = parseDirectEmailRequest({ to: "a@b.co", subject: "s", title: "   ", body: "b" });
    expect(r.ok && r.value.title).toBeUndefined();
  });

  it.each([
    ["no address", { subject: "s", body: "b" }],
    ["a blank subject", { to: "a@b.co", subject: "   ", body: "b" }],
    ["a blank body", { to: "a@b.co", subject: "s", body: " \n " }],
    ["more than one address", { to: ["a@b.co", "c@d.co"], subject: "s", body: "b" }],
    ["something that is not an address", { to: "not-an-email", subject: "s", body: "b" }],
    ["no request body at all", null],
  ])("refuses %s", (_label, input) => {
    expect(parseDirectEmailRequest(input).ok).toBe(false);
  });
});

const EVIL = `<script>alert(1)</script>`;

describe.each([
  ["direct", buildDirectEmailHtml],
])("%s email", (_name, build) => {
  it("escapes the admin's subject, title and body", () => {
    const html = build({ subject: EVIL, title: EVIL, body: `Hello\n${EVIL}` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("keeps the admin's text as written, one paragraph per line", () => {
    const html = build({ subject: "s", body: "First line\n\n• A bullet\nLast line" });
    expect(html).toContain(">First line</p>");
    expect(html).toContain("padding-left:16px;");
    expect(html).toContain(">• A bullet</p>");
    expect(html).toContain(">Last line</p>");
  });

  it("only shows an allow-listed banner", () => {
    const ok = "https://abc.supabase.co/storage/v1/object/public/banners/x.png";
    expect(build({ subject: "s", body: "b", bannerUrl: ok })).toContain(`src="${ok}"`);
    expect(build({ subject: "s", body: "b", bannerUrl: "https://evil.test/x.png" })).not.toContain("evil.test");
    expect(build({ subject: "s", body: "b", bannerUrl: "javascript:alert(1)" })).not.toContain("javascript:");
  });

  it("has one h1 (title, else subject) and exactly one navy button", () => {
    const withTitle = build({ subject: "Subject", title: "Title", body: "b" });
    expect(withTitle.match(/<h1/g)).toHaveLength(1);
    expect(withTitle).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(build({ subject: "Subject", body: "b" })).toMatch(/<h1[^>]*>Subject<\/h1>/);
    expect(withTitle.match(/background:#041335;color:#ffffff;/g)).toHaveLength(1);
  });

  it("adds no emoji of its own", () => {
    expect(build({ subject: "s", body: "b" })).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
