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
  return `<img src="${text(bannerUrl)}" alt="" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:12px;margin:0 0 24px;">`;
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
      `Questions? We're here to help. Call <a href="tel:+18322198320">(832) 219-8320</a> or email <a href="mailto:info@thelaunchpadwash.com">info@thelaunchpadwash.com</a>.`,
      { muted: true, small: true },
    ),
  ].join("\n");
  return emailLayout({
    title: params.subject,
    preheader: params.title?.trim() ? params.title : params.subject,
    body: messageBody(params, action),
  });
}
