import { describe, expect, it } from "vitest";
import { button, details, emailLayout, heading, plate, salutation, signoff } from "./layout";

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

  it("draws the action button as a squared navy button with white text", () => {
    expect(html).toContain("background:#041335;color:#ffffff;");
    expect(html).toContain("border-radius:2px");
  });

  it("has a centred logo and spaced wordmark, with no navy band or tinted canvas", () => {
    expect(html).toContain("letter-spacing:0.28em");
    expect(html).toContain(">THE LAUNCH PAD<");
    expect(html).not.toContain("border-radius:16px");
    expect(html).not.toContain("#f4f7fb");
  });
});

describe("quiet formal helpers", () => {
  it("makes the secondary action a plain underlined link, not a box", () => {
    const out = button("https://example.com/r", "Write a review", "secondary");
    expect(out).toContain("text-decoration:underline");
    expect(out).not.toContain("background:");
  });

  it("uses a medium-weight headline", () => {
    expect(heading("Hello")).toContain("font-weight:500");
  });

  it("opens with 'Dear <first name>,' or 'Hello,' and escapes the name", () => {
    expect(salutation("Pat")).toContain("Dear Pat,");
    expect(salutation(null)).toContain("Hello,");
    expect(salutation("  ")).toContain("Hello,");
    expect(salutation("<b>")).toContain("Dear &lt;b&gt;,");
  });

  it("signs off formally", () => {
    expect(signoff()).toContain("Kind regards,<br>The Launch Pad");
    expect(signoff()).not.toContain("See you at the pad");
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
