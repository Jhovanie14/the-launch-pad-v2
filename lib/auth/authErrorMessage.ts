/**
 * Turns a Supabase auth error into copy we are willing to show a customer.
 *
 * Supabase's own strings are written for developers ("email rate limit
 * exceeded"), so surfacing them raw leaves a signup looking broken with no
 * hint of what to do next. Every branch here answers "what should I do?".
 *
 * Pure by design: the caller logs the raw error, so tests stay quiet.
 */

/** Which flow the error came from — only used to name the email correctly. */
export type AuthAction = "signup" | "signin" | "reset" | "resend";

const GENERIC = "Something went wrong. Please try again.";

/** The email each flow was trying to send, for the throttle message. */
const EMAIL_NOUN: Record<AuthAction, string> = {
  signup: "confirmation email",
  resend: "confirmation email",
  reset: "password reset email",
  // Sign-in sends nothing, but the throttle is shared, so keep it sensible.
  signin: "confirmation email",
};

function emailThrottleMessage(action: AuthAction): string {
  return `We're sending a lot of mail right now and this ${EMAIL_NOUN[action]} was held back. Please wait a few minutes and try again.`;
}

const BY_CODE: Record<string, (action: AuthAction) => string> = {
  over_email_send_rate_limit: emailThrottleMessage,
  over_request_rate_limit: () =>
    "Too many attempts from this device. Please wait a moment and try again.",
  captcha_failed: () =>
    "Captcha verification failed. Please try again — you may need to complete the check once more.",
  invalid_credentials: () => "Invalid email or password.",
  email_not_confirmed: () =>
    "Please confirm your email address before signing in. Check your inbox for the confirmation link.",
  user_already_exists: () =>
    "This email is already registered. Try signing in instead.",
  email_exists: () =>
    "This email is already registered. Try signing in instead.",
  weak_password: () =>
    "Please choose a stronger password — at least 8 characters, mixing letters and numbers.",
  email_address_invalid: () => "Please enter a valid email address.",
};

/**
 * Older gotrue releases (and some proxies) return a message with no `code`,
 * so fall back to matching the wording. Order matters: captcha and the email
 * throttle are both checked before the broader rate-limit catch-all.
 */
function codeFromMessage(message: string): string | undefined {
  const m = message.toLowerCase();
  if (m.includes("captcha")) return "captcha_failed";
  if (m.includes("email rate limit") || (m.includes("rate limit") && m.includes("email")))
    return "over_email_send_rate_limit";
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "over_request_rate_limit";
  if (m.includes("email not confirmed")) return "email_not_confirmed";
  if (m.includes("invalid login credentials")) return "invalid_credentials";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "user_already_exists";
  return undefined;
}

export function authErrorMessage(error: unknown, action: AuthAction): string {
  if (!error || typeof error !== "object") return GENERIC;

  const { code, message } = error as { code?: unknown; message?: unknown };

  // The code is authoritative; the message is only a fallback for old responses.
  const resolved =
    (typeof code === "string" && code) ||
    (typeof message === "string" ? codeFromMessage(message) : undefined);

  const handler = resolved ? BY_CODE[resolved] : undefined;
  return handler ? handler(action) : GENERIC;
}
