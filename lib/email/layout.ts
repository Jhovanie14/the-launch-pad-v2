/**
 * The Launch Pad email layout: every email we send is built from these
 * pieces, so they all look like one brand.
 *
 * Email clients cannot read CSS variables, OKLCH or web fonts, so the
 * website's tokens (app/globals.css) appear here as their hex equivalents
 * (DESIGN.md, "Email"). Styles are inline, layout is presentational tables,
 * and every dynamic string goes through `text()` (HTML-escaped).
 *
 * Shape of every email: navy band with the logo → white card with one h1,
 * the message, and at most one flame button → footer with the site's facts.
 */
import { escapeHtml } from "./escapeHtml";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelaunchpadwash.com";
export const FROM = "The Launch Pad <noreply@thelaunchpadwash.com>";

/** Hex equivalents of the brand tokens in app/globals.css. */
export const EMAIL_COLORS = {
  night: "#041335",
  dusk: "#0b234e",
  flame: "#fec92f",
  onFlame: "#041335",
  ink: "#041335",
  inkMuted: "#4a596f",
  inkSubtle: "#637389",
  line: "#dae2ec",
  lineSoft: "#ecf1f7",
  canvas: "#f4f7fb",
  paper: "#ffffff",
  brandBlue: "#2460b7",
  brandRed: "#f14445",
  onNightMuted: "#bfcfe5",
  // Notice backgrounds: tints, never side stripes.
  warnBg: "#fff6db",
  dangerBg: "#fdecec",
  dangerInk: "#a3171c",
  okBg: "#e8f5ee",
  okInk: "#14653a",
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
  /** Card content, built from the helpers below. */
  body: string;
  /** One line under the site facts, e.g. why they got this email. */
  footerNote?: string;
  /** Marketing email only: one-click way out. */
  unsubscribeUrl?: string;
}

export function emailLayout({ title, preheader, body, footerNote, unsubscribeUrl }: EmailLayoutOptions): string {
  const logo = `${SITE_URL}/thelaunchpad.png`;
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${text(title)}</title>
<style>
  a { color:${C.brandBlue}; }
  @media (max-width:600px) {
    .lp-card { padding:28px 20px !important; }
    .lp-h1 { font-size:24px !important; }
    .lp-btn a { display:block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div lang="en" dir="ltr" style="background:${C.canvas};font-family:${EMAIL_FONT};color:${C.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.canvas};">${text(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr><td style="background:${C.night};border-radius:16px 16px 0 0;padding:20px 28px;">
          <a href="${SITE_URL}" style="text-decoration:none;color:#ffffff;">
            <img src="${logo}" width="44" height="44" alt="The Launch Pad" style="vertical-align:middle;border:0;">
            <span style="vertical-align:middle;margin-left:10px;font-size:15px;font-weight:900;letter-spacing:0.02em;color:#ffffff;">THE LAUNCH PAD</span>
          </a>
        </td></tr>
        <tr><td class="lp-card" style="background:${C.paper};padding:36px 32px;border-radius:0 0 16px 16px;font-size:16px;line-height:1.6;color:${C.ink};">
${body}
        </td></tr>
        <tr><td style="padding:24px 28px 8px;font-size:13px;line-height:1.6;color:${C.inkMuted};text-align:center;">
          <p style="margin:0;"><strong style="color:${C.ink};">The Launch Pad</strong> · ${SITE.address}</p>
          <p style="margin:4px 0 0;"><a href="${SITE.phoneHref}" style="color:${C.inkMuted};">${SITE.phone}</a> · <a href="mailto:${SITE.email}" style="color:${C.inkMuted};">${SITE.email}</a> · <a href="${SITE_URL}" style="color:${C.inkMuted};">thelaunchpadwash.com</a></p>
          ${footerNote ? `<p style="margin:12px 0 0;color:${C.inkSubtle};">${footerNote}</p>` : ""}
          ${unsubscribeUrl ? `<p style="margin:12px 0 0;"><a href="${unsubscribeUrl}" style="color:${C.inkMuted};">Unsubscribe from product news and offers</a></p>` : ""}
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
  return `<h1 class="lp-h1" style="margin:0 0 16px;font-size:28px;line-height:1.15;font-weight:900;letter-spacing:-0.02em;color:${C.ink};">${text(value)}</h1>`;
}

/** A section heading inside the card. Pass plain text. */
export function subheading(value: string): string {
  return `<h2 style="margin:28px 0 8px;font-size:18px;line-height:1.3;font-weight:800;color:${C.ink};">${text(value)}</h2>`;
}

/** A paragraph. `html` is trusted markup: escape dynamic parts with text(). */
export function paragraph(html: string, opts: { muted?: boolean; small?: boolean } = {}): string {
  const color = opts.muted ? C.inkMuted : C.ink;
  const size = opts.small ? "14px" : "16px";
  return `<p style="margin:0 0 16px;font-size:${size};line-height:1.6;color:${color};">${html}</p>`;
}

/** The one flame action (primary) or a quiet outlined link (secondary). */
export function button(href: string, label: string, variant: "primary" | "secondary" = "primary"): string {
  const style =
    variant === "primary"
      ? `background:${C.flame};color:${C.onFlame};border:2px solid ${C.flame};`
      : `background:${C.paper};color:${C.ink};border:2px solid ${C.line};`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="lp-btn" style="margin:24px 0;"><tr><td style="border-radius:10px;">
  <a href="${text(href)}" style="${style}display:inline-block;padding:14px 26px;border-radius:10px;font-size:16px;font-weight:800;text-decoration:none;text-align:center;">${text(label)}</a>
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
      const border = i === rows.length - 1 ? "" : `border-bottom:1px solid ${C.lineSoft};`;
      return `<tr>
    <th scope="row" align="left" style="padding:10px 0;${border}font-size:14px;font-weight:500;color:${C.inkMuted};vertical-align:top;">${text(label)}</th>
    <td align="right" style="padding:10px 0;${border}font-size:${last ? "18px" : "15px"};font-weight:${last ? "900" : "600"};color:${C.ink};vertical-align:top;">${value}</td>
  </tr>`;
    })
    .join("\n");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;border-collapse:collapse;background:${C.canvas};border-radius:12px;">
  <tr><td style="padding:6px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
${body}
    </table>
  </td></tr>
</table>`;
}

/** A tinted note: info (neutral), warn, danger or ok. Trusted HTML. */
export function notice(html: string, tone: "info" | "warn" | "danger" | "ok" = "info"): string {
  const bg = { info: C.lineSoft, warn: C.warnBg, danger: C.dangerBg, ok: C.okBg }[tone];
  const color = { info: C.ink, warn: C.ink, danger: C.dangerInk, ok: C.okInk }[tone];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td style="background:${bg};border-radius:12px;padding:16px 20px;font-size:15px;line-height:1.55;color:${color};">${html}</td></tr></table>`;
}

/** A license plate drawn like a plate, as on the website. */
export function plate(value: string): string {
  return `<span style="display:inline-block;padding:2px 8px;border:1px solid ${C.line};border-radius:5px;background:#ffffff;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:14px;font-weight:700;letter-spacing:0.12em;color:${C.night};text-transform:uppercase;">${text(value)}</span>`;
}

/** Simple bullet list. Items are trusted HTML. */
export function list(items: string[]): string {
  return `<ul style="margin:0 0 16px;padding-left:20px;color:${C.ink};font-size:15px;line-height:1.6;">${items
    .map((item) => `<li style="margin:0 0 6px;">${item}</li>`)
    .join("")}</ul>`;
}

export function signoff(): string {
  return paragraph(`See you at the pad,<br>The Launch Pad team`, { muted: true });
}

/** "$12.50" from dollars. */
export function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
