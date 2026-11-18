/**
 * Emails whose words an admin wrote in /admin/broadcast (Direct email): a
 * message to one customer. Bulk email goes through Campaigns
 * (lib/marketing/campaignEmail.ts), which only reaches opted-in customers.
 * The admin's text is kept exactly as written (escaped, one paragraph per
 * line); the layout adds the brand, the one action and the footer.
 */
import { isAllowedBannerUrl } from "./escapeHtml";
import { EMAIL_COLORS, SITE_URL, button, emailLayout, heading, paragraph, text } from "./layout";

export interface AdminMessageParams {
  subject: string;
  title?: string;
  body: string;
  bannerUrl?: string;
}

export type DirectEmailRequest =
  | { ok: true; value: AdminMessageParams & { to: string } }
  | { ok: false; error: string };

const asText = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Checks and tidies what the Direct email page posts. The address, subject and
 * title are trimmed, because a stray space typed into the subject used to reach
 * the customer's inbox. Exactly one address is accepted, because this page is
 * for one customer at a time. The body keeps its line breaks.
 */
export function parseDirectEmailRequest(input: unknown): DirectEmailRequest {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const to = asText(raw.to);
  const subject = asText(raw.subject);
  const title = asText(raw.title) || undefined;
  const body = typeof raw.body === "string" ? raw.body : "";
  const bannerUrl = asText(raw.bannerUrl) || undefined;

  if (!to || !subject || !body.trim()) {
    return { ok: false, error: "An address, a subject and a message are required." };
  }
  if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to)) {
    return { ok: false, error: "That email address does not look right." };
  }
  return { ok: true, value: { to, subject, title, body, bannerUrl } };
}

/** One escaped paragraph per non-empty line; "•" / "-" lines are indented. */
export function adminMessageBodyHtml(body: string): string {
  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
        return `<p style="margin:0 0 10px;padding-left:16px;font-size:16px;line-height:1.6;color:${EMAIL_COLORS.ink};">${text(trimmed)}</p>`;
      }
      return paragraph(text(trimmed));
    })
    .join("\n");
}

/** Only our own Supabase-hosted https images (isAllowedBannerUrl). */
export function bannerHtml(bannerUrl: string | undefined): string {
  if (!isAllowedBannerUrl(bannerUrl)) return "";
  return `<img src="${text(bannerUrl)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:2px;margin:0 0 24px;">`;
}

function messageBody({ subject, title, body, bannerUrl }: AdminMessageParams, action: string): string {
  return [
    bannerHtml(bannerUrl),
    heading(title?.trim() ? title : subject),
    adminMessageBodyHtml(body),
    action,
  ].join("\n");
}

/** A one-to-one message from the team to a single customer. */
export function buildDirectEmailHtml(params: AdminMessageParams): string {
  const action = [
    button(`${SITE_URL}/dashboard`, "Go to your dashboard"),
    paragraph(
      `Should you have any questions, we are glad to help. Call <a href="tel:+18322198320">(832) 219-8320</a> or email <a href="mailto:info@thelaunchpadwash.com">info@thelaunchpadwash.com</a>.`,
      { muted: true, small: true },
    ),
  ].join("\n");
  return emailLayout({
    title: params.subject,
    preheader: params.title?.trim() ? params.title : params.subject,
    body: messageBody(params, action),
  });
}
