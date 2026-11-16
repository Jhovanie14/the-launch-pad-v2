/**
 * The Launch Pad email layout: every email we send is built from these
 * pieces, so they all look like one brand.
 *
 * Look: "quiet formal" (DESIGN.md, "Email"; chosen 2026-11-16). Premium,
 * formal and plain: white page, small centred logo over a spaced wordmark,
 * hairline rules, a medium-weight headline, one squared navy button.
 *
 * Email clients cannot read CSS variables, OKLCH or web fonts, so the
 * website's tokens appear here as hex. Styles are inline, layout is
 * presentational tables, and every dynamic string goes through `text()`
 * (HTML-escaped).
 */
import { escapeHtml } from "./escapeHtml";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelaunchpadwash.com";
export const FROM = "The Launch Pad Wash <noreply@thelaunchpadwash.com>";

/** Hex equivalents of the brand tokens in app/globals.css (DESIGN.md email-*). */
export const EMAIL_COLORS = {
  night: "#041335",
  ink: "#1f2a3a",
  inkMuted: "#5b6675",
  inkSubtle: "#7a8594",
  rule: "#e5e8ec",
  line: "#dae2ec",
  paper: "#ffffff",
  // Notice backgrounds: quiet tints, never side stripes.
  infoBg: "#f3f5f8",
  warnBg: "#fbf6e6",
  dangerBg: "#fbefef",
  dangerInk: "#8f1a1e",
  okBg: "#eef6f1",
  okInk: "#1d5a39",
} as const;

const C = EMAIL_COLORS;
export const EMAIL_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const SITE = {
  address: "10410 S Main St, Houston, TX 77025",
  phone: "(832) 219-8320",
  phoneHref: "tel:+18322198320",
  email: "info@thelaunchpadwash.com",
};

/** Escape a dynamic value for HTML. Use for every name, plate, address… */
export const text = escapeHtml;

export interface EmailLayoutOptions {
  /** <title> and the subject's meaning, for screen readers. */
  title: string;
  /** Inbox preview line (hidden in the body). */
  preheader: string;
  /** Message content, built from the helpers below. */
  body: string;
  /** One line under the site facts, e.g. why they got this email. */
  footerNote?: string;
  /** Marketing email only: one-click way out. */
  unsubscribeUrl?: string;
}

export function emailLayout({ title, preheader, body, footerNote, unsubscribeUrl }: EmailLayoutOptions): string {
  const logo = `${SITE_URL}/thelaunchpad.png`;
  const muted = `color:${C.inkSubtle};`;
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${text(title)}</title>
<style>
  a { color:${C.night}; }
  @media (max-width:600px) {
    .lp-wrap { padding:28px 20px !important; }
    .lp-btn a { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
<div lang="en" dir="ltr" style="background:${C.paper};font-family:${EMAIL_FONT};color:${C.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.paper};">${text(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};">
    <tr><td class="lp-wrap" align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td align="center" style="padding:0 0 28px;border-bottom:1px solid ${C.rule};">
          <a href="${SITE_URL}" style="text-decoration:none;color:${C.night};">
            <img src="${logo}" width="40" height="40" alt="The Launch Pad" style="display:block;margin:0 auto 10px;border:0;">
            <span style="display:block;font-size:12px;font-weight:600;letter-spacing:0.28em;color:${C.night};">THE LAUNCH PAD</span>
          </a>
        </td></tr>
        <tr><td style="padding:36px 0 12px;font-size:15px;line-height:1.7;color:${C.ink};">
${body}
        </td></tr>
        <tr><td style="padding:28px 0 0;border-top:1px solid ${C.rule};font-size:12px;line-height:1.7;${muted}text-align:center;">
          <p style="margin:0;">The Launch Pad · ${SITE.address}</p>
          <p style="margin:2px 0 0;"><a href="${SITE.phoneHref}" style="${muted}">${SITE.phone}</a> · <a href="mailto:${SITE.email}" style="${muted}">${SITE.email}</a> · <a href="${SITE_URL}" style="${muted}">thelaunchpadwash.com</a></p>
          ${footerNote ? `<p style="margin:12px 0 0;">${footerNote}</p>` : ""}
          ${unsubscribeUrl ? `<p style="margin:12px 0 0;"><a href="${unsubscribeUrl}" style="${muted}">Unsubscribe from product news and offers</a></p>` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
</body>
</html>`;
}

/** The email's one heading. Pass plain text. */
export function heading(value: string): string {
  return `<h1 class="lp-h1" style="margin:0 0 24px;font-size:22px;line-height:1.3;font-weight:500;letter-spacing:-0.01em;color:${C.night};">${text(value)}</h1>`;
}

/** A section heading inside the message. Pass plain text. */
export function subheading(value: string): string {
  return `<h2 style="margin:28px 0 8px;font-size:17px;line-height:1.35;font-weight:600;color:${C.night};">${text(value)}</h2>`;
}

/** A paragraph. `html` is trusted markup: escape dynamic parts with text(). */
export function paragraph(html: string, opts: { muted?: boolean; small?: boolean } = {}): string {
  const color = opts.muted ? C.inkMuted : C.ink;
  const size = opts.small ? "13px" : "15px";
  return `<p style="margin:0 0 16px;font-size:${size};line-height:1.7;color:${color};">${html}</p>`;
}

/** The one squared navy action (primary), or an underlined text link (secondary). */
export function button(href: string, label: string, variant: "primary" | "secondary" = "primary"): string {
  if (variant === "secondary") {
    return `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;"><a href="${text(href)}" style="color:${C.night};text-decoration:underline;">${text(label)}</a></p>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="lp-btn" style="margin:28px 0;"><tr><td style="border-radius:2px;">
  <a href="${text(href)}" style="background:${C.night};color:#ffffff;display:inline-block;padding:13px 30px;border-radius:2px;font-size:13px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;text-align:center;">${text(label)}</a>
</td></tr></table>`;
}

/**
 * Label / value facts (date, vehicle, total…). A real data table, so screen
 * readers read "Date: Sat, Nov 8". Values are trusted HTML: escape with text().
 */
export function details(rows: Array<[label: string, valueHtml: string]>, opts: { emphasizeLast?: boolean } = {}): string {
  const body = rows
    .map(([label, value], i) => {
      const last = opts.emphasizeLast && i === rows.length - 1;
      return `<tr>
    <th scope="row" align="left" style="padding:11px 0;border-bottom:1px solid ${C.rule};font-size:14px;font-weight:400;color:${C.inkMuted};vertical-align:top;">${text(label)}</th>
    <td align="right" style="padding:11px 0;border-bottom:1px solid ${C.rule};font-size:${last ? "16px" : "14px"};font-weight:${last ? "600" : "500"};color:${C.night};vertical-align:top;">${value}</td>
  </tr>`;
    })
    .join("\n");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-collapse:collapse;border-top:1px solid ${C.rule};">
${body}
</table>`;
}

/** A quiet tinted note: info (neutral), warn, danger or ok. Trusted HTML. */
export function notice(html: string, tone: "info" | "warn" | "danger" | "ok" = "info"): string {
  const bg = { info: C.infoBg, warn: C.warnBg, danger: C.dangerBg, ok: C.okBg }[tone];
  const color = { info: C.ink, warn: C.ink, danger: C.dangerInk, ok: C.okInk }[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${bg};border-radius:2px;padding:16px 20px;font-size:14px;line-height:1.6;color:${color};">${html}</td></tr></table>`;
}

/** A license plate drawn like a plate, as on the website. */
export function plate(value: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border:1px solid ${C.line};border-radius:5px;background:#ffffff;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;font-weight:700;letter-spacing:0.12em;color:${C.night};text-transform:uppercase;">${text(value)}</span>`;
}

/** Simple bullet list. Items are trusted HTML. */
export function list(items: string[]): string {
  return `<ul style="margin:0 0 16px;padding-left:20px;color:${C.ink};font-size:15px;line-height:1.7;">${items
    .map((item) => `<li style="margin:0 0 6px;">${item}</li>`)
    .join("")}</ul>`;
}

/**
 * "Call or email us" line. Emails come from noreply@, so they point at the
 * phone and inbox people actually answer instead of asking for a reply.
 */
export function contactLine(lead: string): string {
  return paragraph(
    `${lead} Call <a href="${SITE.phoneHref}">${SITE.phone}</a> or email <a href="mailto:${SITE.email}">${SITE.email}</a>.`,
  );
}

export function signoff(): string {
  return `<p style="margin:28px 0 0;font-size:15px;line-height:1.7;color:${C.ink};">Kind regards,<br>The Launch Pad</p>`;
}

/** "$12.50" from dollars. */
export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
