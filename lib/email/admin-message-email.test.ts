import { describe, expect, it } from "vitest";
import { buildBroadcastEmailHtml, buildDirectEmailHtml } from "./admin-message-email";

const EVIL = `<script>alert(1)</script>`;

describe.each([
  ["broadcast", buildBroadcastEmailHtml],
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

  it("has one h1 (title, else subject) and exactly one flame button", () => {
    const withTitle = build({ subject: "Subject", title: "Title", body: "b" });
    expect(withTitle.match(/<h1/g)).toHaveLength(1);
    expect(withTitle).toMatch(/<h1[^>]*>Title<\/h1>/);
    expect(build({ subject: "Subject", body: "b" })).toMatch(/<h1[^>]*>Subject<\/h1>/);
    expect(withTitle.match(/background:#fec92f/g)).toHaveLength(1);
  });

  it("adds no emoji of its own", () => {
    expect(build({ subject: "s", body: "b" })).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});
