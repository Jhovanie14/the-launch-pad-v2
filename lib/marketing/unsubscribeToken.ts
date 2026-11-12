import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed one-click unsubscribe links for marketing emails we send one by one
 * (automatic emails). Campaigns use Resend's own link instead.
 *
 * Token = base64url(email) + "." + base64url(HMAC-SHA256(email)). It never
 * expires: an unsubscribe link must keep working in an old email. The only
 * thing it can do is unsubscribe that one address, so a leaked link can't
 * hurt anyone. Secret: MARKETING_UNSUBSCRIBE_SECRET (server only).
 */

function sign(email: string, secret: string): string {
  return createHmac("sha256", secret).update(`unsubscribe:${email}`).digest("base64url");
}

export function createUnsubscribeToken(email: string, secret: string): string {
  return `${Buffer.from(email, "utf8").toString("base64url")}.${sign(email, secret)}`;
}

/** The email the token was made for, or null if it is missing, malformed or forged. */
export function verifyUnsubscribeToken(token: string | null | undefined, secret: string): string | null {
  if (!token || !secret) return null;
  const [payload, sig, extra] = token.split(".");
  if (!payload || !sig || extra !== undefined) return null;

  const email = Buffer.from(payload, "base64url").toString("utf8");
  if (!email.includes("@")) return null;

  const expected = Buffer.from(sign(email, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return email;
}

export function unsubscribeUrl(email: string, secret: string, siteUrl: string): string {
  return `${siteUrl}/unsubscribe?t=${createUnsubscribeToken(email, secret)}`;
}
