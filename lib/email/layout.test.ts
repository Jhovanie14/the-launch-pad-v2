import { describe, expect, it } from "vitest";
import { button, details, emailLayout, heading, plate } from "./layout";

describe("emailLayout", () => {
  const html = emailLayout({
    title: "Your booking is confirmed",
    preheader: "Sat, Nov 8 at 10:30 AM",
    body: heading("You're booked") + button("https://example.com/b", "View booking"),
    unsubscribeUrl: "https://example.com/u",
  });

  it("sets language and direction on <html> and the body wrapper", () => {
    expect(html).toContain('<html lang="en" dir="ltr">');
    expect(html).toContain('<div lang="en" dir="ltr"');
  });

  it("marks layout tables as presentational", () => {
    expect(html).toMatch(/<table role="presentation"/);
  });

  it("has one h1 and the title", () => {
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("<title>Your booking is confirmed</title>");
  });

  it("shows the unsubscribe link only when given", () => {
    expect(html).toContain("Unsubscribe from product news and offers");
    expect(emailLayout({ title: "t", preheader: "p", body: "" })).not.toContain("Unsubscribe");
  });

  it("brands the action button in flame with navy text", () => {
    expect(html).toContain("background:#fec92f;color:#041335;");
  });
});

describe("helpers escape dynamic values", () => {
  it("escapes heading, button label, href and plate", () => {
    const evil = '<img src=x onerror="alert(1)">';
    expect(heading(evil)).not.toContain("<img");
    expect(button(`https://x.test/?a="${evil}`, evil)).not.toContain("<img");
    expect(plate(evil)).not.toContain("<img");
  });

  it("escapes detail labels but trusts values (callers escape them)", () => {
    const out = details([["<b>Date</b>", "<strong>Nov 8</strong>"]]);
    expect(out).toContain("&lt;b&gt;Date&lt;/b&gt;");
    expect(out).toContain("<strong>Nov 8</strong>");
    expect(out).toContain('scope="row"');
  });
});
