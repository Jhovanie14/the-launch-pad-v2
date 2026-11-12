/**
 * A marketing campaign: news or an offer sent to everyone who opted in to
 * "product news & offers". Pure (no Resend, no database), so the admin page
 * can render the exact same HTML as a live preview.
 *
 * The admin's words are escaped and laid out one paragraph per line, like the
 * member broadcast. Unlike that one, a campaign always carries an unsubscribe
 * link: Resend fills RESEND_UNSUBSCRIBE_URL per recipient.
 */
import { adminMessageBodyHtml, bannerHtml } from "@/lib/email/admin-message-email";
import { isAllowedBannerUrl } from "@/lib/email/escapeHtml";
import { SITE_URL, button, emailLayout, heading } from "@/lib/email/layout";

export interface CampaignContent {
  subject: string;
  /** Inbox preview line. Falls back to the heading, then the subject. */
  previewText?: string;
  /** Heading inside the email. Falls back to the subject. */
  title?: string;
  body: string;
  bannerUrl?: string;
}

export const CAMPAIGN_LIMITS = { subject: 120, previewText: 150, title: 120, body: 5000 } as const;

/** Resend swaps this for each recipient's one-click unsubscribe link. */
export const RESEND_UNSUBSCRIBE_URL = "{{{RESEND_UNSUBSCRIBE_URL}}}";

/** Where a test email's unsubscribe link points (the real one only exists in a broadcast). */
export const TEST_UNSUBSCRIBE_URL = `${SITE_URL}/dashboard/settings`;

const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 30 * 24 * 60 * 60 * 1000;

/** Plain-language problems to show the admin; empty when the campaign can go. */
export function campaignProblems(c: CampaignContent): string[] {
  const problems: string[] = [];
  const subject = c.subject?.trim() ?? "";
  const body = c.body?.trim() ?? "";

  if (!subject) problems.push("Add a subject line.");
  else if (subject.length > CAMPAIGN_LIMITS.subject)
    problems.push(`Keep the subject under ${CAMPAIGN_LIMITS.subject} characters.`);

  if ((c.previewText?.trim().length ?? 0) > CAMPAIGN_LIMITS.previewText)
    problems.push(`Keep the preview text under ${CAMPAIGN_LIMITS.previewText} characters.`);

  if ((c.title?.trim().length ?? 0) > CAMPAIGN_LIMITS.title)
    problems.push(`Keep the heading under ${CAMPAIGN_LIMITS.title} characters.`);

  if (!body) problems.push("Write the message.");
  else if (body.length > CAMPAIGN_LIMITS.body)
    problems.push(`Keep the message under ${CAMPAIGN_LIMITS.body} characters.`);

  if (c.bannerUrl?.trim() && !isAllowedBannerUrl(c.bannerUrl.trim()))
    problems.push("The banner must be an image uploaded to our storage (a supabase.co link).");

  return problems;
}

/** Null when `iso` is absent (send now) or a usable send time. */
export function scheduleProblem(iso: string | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return "That send time isn't a valid date.";
  const lead = at - now.getTime();
  if (lead < MIN_LEAD_MS) return "Pick a time at least 5 minutes from now.";
  if (lead > MAX_LEAD_MS) return "Pick a time within the next 30 days.";
  return null;
}

export function buildCampaignHtml(c: CampaignContent, opts: { unsubscribeUrl: string }): string {
  const title = c.title?.trim() || c.subject;
  return emailLayout({
    title: c.subject,
    preheader: c.previewText?.trim() || title,
    body: [
      bannerHtml(c.bannerUrl?.trim() || undefined),
      heading(title),
      adminMessageBodyHtml(c.body ?? ""),
      button(`${SITE_URL}/service`, "Book a wash"),
    ].join("\n"),
    footerNote: "You're getting this email because you asked for news and offers from The Launch Pad.",
    unsubscribeUrl: opts.unsubscribeUrl,
  });
}
