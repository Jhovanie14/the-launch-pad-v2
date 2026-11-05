/**
 * Supabase sends the account emails itself (confirm sign-up, reset password,
 * magic link, change email, invite), so they can't call our code. These
 * builders render them with the same layout as every other email, keeping
 * Supabase's Go template variables ({{ .ConfirmationURL }} …) in place.
 *
 * Regenerate the files with `node scripts/build-auth-emails.mjs`, then paste
 * each one into Supabase → Authentication → Email Templates.
 */
import { button, emailLayout, heading, paragraph, text } from "./layout";

/** Left untouched by our escaping, filled in by Supabase. */
const CONFIRMATION_URL = "{{ .ConfirmationURL }}";
const NEW_EMAIL = "{{ .NewEmail }}";

export interface AuthTemplate {
  /** File name under supabase/templates/. */
  file: string;
  /** Where it goes in the Supabase dashboard. */
  dashboardName: string;
  subject: string;
  html: string;
}

const ignore = (what: string) =>
  paragraph(`If you didn't ${what}, you can ignore this email. Nothing changes until the link is used.`, {
    muted: true,
    small: true,
  });

function linkFallback(): string {
  return paragraph(
    `Button not working? Copy this link into your browser:<br><a href="${CONFIRMATION_URL}" style="word-break:break-all;">${CONFIRMATION_URL}</a>`,
    { muted: true, small: true },
  );
}

/** Supabase's own variable must reach the HTML unescaped, so the button is written by hand here. */
function actionButton(label: string): string {
  return button("__URL__", label).replace("__URL__", CONFIRMATION_URL);
}

export function buildAuthTemplates(): AuthTemplate[] {
  return [
    {
      file: "confirmation.html",
      dashboardName: "Confirm signup",
      subject: "Confirm your email for The Launch Pad",
      html: emailLayout({
        title: "Confirm your email",
        preheader: "One tap and your Launch Pad account is ready.",
        body: [
          heading("Confirm your email"),
          paragraph(
            "Thanks for signing up. Confirm this is your email and you can book express details, manage a membership and see every visit in one place.",
          ),
          actionButton("Confirm my email"),
          linkFallback(),
          ignore("create a Launch Pad account"),
        ].join("\n"),
        footerNote: "You're getting this because this email was used to sign up at thelaunchpadwash.com.",
      }),
    },
    {
      file: "recovery.html",
      dashboardName: "Reset password",
      subject: "Reset your Launch Pad password",
      html: emailLayout({
        title: "Reset your password",
        preheader: "Choose a new password for your Launch Pad account.",
        body: [
          heading("Reset your password"),
          paragraph("We got a request to reset the password for your Launch Pad account. The link works once and expires soon."),
          actionButton("Choose a new password"),
          linkFallback(),
          ignore("ask to reset your password"),
        ].join("\n"),
        footerNote: "You're getting this because a password reset was requested for this email.",
      }),
    },
    {
      file: "magic_link.html",
      dashboardName: "Magic link",
      subject: "Your Launch Pad sign-in link",
      html: emailLayout({
        title: "Sign in to The Launch Pad",
        preheader: "Your one-time sign-in link.",
        body: [
          heading("Sign in to The Launch Pad"),
          paragraph("Use this link to sign in. It works once and expires soon."),
          actionButton("Sign in"),
          linkFallback(),
          ignore("try to sign in"),
        ].join("\n"),
        footerNote: "You're getting this because a sign-in link was requested for this email.",
      }),
    },
    {
      file: "email_change.html",
      dashboardName: "Change email address",
      subject: "Confirm your new email for The Launch Pad",
      html: emailLayout({
        title: "Confirm your new email",
        preheader: "Confirm the change to your Launch Pad account email.",
        body: [
          heading("Confirm your new email"),
          paragraph(
            `Confirm that you want to use <strong>${NEW_EMAIL}</strong> for your Launch Pad account. Booking emails and receipts will go there from now on.`,
          ),
          actionButton("Confirm new email"),
          linkFallback(),
          ignore("ask to change your email"),
        ].join("\n"),
        footerNote: "You're getting this because an email change was requested for your account.",
      }),
    },
    {
      file: "invite.html",
      dashboardName: "Invite user",
      subject: "You're invited to The Launch Pad",
      html: emailLayout({
        title: "You're invited",
        preheader: "Set up your Launch Pad account.",
        body: [
          heading("You're invited"),
          paragraph(`You've been invited to an account at ${text("The Launch Pad")}. Accept the invite to set your password.`),
          actionButton("Accept the invite"),
          linkFallback(),
        ].join("\n"),
        footerNote: "You're getting this because someone at The Launch Pad invited this email.",
      }),
    },
  ];
}
